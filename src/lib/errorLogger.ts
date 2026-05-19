/**
 * Client-side error logging.
 *
 * Two layers:
 *   1. In-memory ring buffer (last 100) for the legacy admin "Systeem"
 *      tab and as a "what happened just before the crash" trail.
 *   2. Persistent storage in Supabase `client_errors` table via the
 *      report_client_error RPC. Server-side dedup means 1M identical
 *      errors → still 1 row.
 *
 * Throttling: each unique fingerprint (msg+route) is reported at most
 * once per 30s from a single browser, so an error-storm doesn't hammer
 * the network.
 */

import { supabase } from "@/integrations/supabase/client";

interface ErrorLog {
  timestamp: string;
  type: "error" | "slow_query" | "supabase_error";
  message: string;
  details?: string;
}

const MAX_LOGS = 100;
const logs: ErrorLog[] = [];

const IGNORED_ERROR_PATTERNS: RegExp[] = [
  /ResizeObserver loop/i,
  /AbortError/i,
  /The user aborted a request/i,
  /Failed to fetch/i,                 // network blips, captured elsewhere
  /Load failed/i,
  /NetworkError when attempting to fetch resource/i,
  /cancelled/i,
];

function shouldIgnore(message: string | undefined | null): boolean {
  if (!message) return false;
  return IGNORED_ERROR_PATTERNS.some((re) => re.test(message));
}

function fingerprint(msg: string, route: string): string {
  return `${msg.slice(0, 200)}|${route}`;
}

const lastReportedAt = new Map<string, number>();
const THROTTLE_MS = 30_000;

function reportToServer(message: string, stack?: string, payload?: Record<string, unknown>) {
  const route = typeof window !== "undefined" ? window.location.pathname : "";
  const fp = fingerprint(message, route);
  const now = Date.now();
  const last = lastReportedAt.get(fp) || 0;
  if (now - last < THROTTLE_MS) return;
  lastReportedAt.set(fp, now);

  supabase
    .rpc("report_client_error", {
      _message:    message.slice(0, 500),
      _stack:      stack?.slice(0, 4000) || null,
      _route:      route.slice(0, 300),
      _user_agent: navigator.userAgent?.slice(0, 300) || null,
      _payload:    payload || {},
    })
    .then(() => {}, () => {});
}

function addLog(log: Omit<ErrorLog, "timestamp">) {
  logs.unshift({ ...log, timestamp: new Date().toISOString() });
  if (logs.length > MAX_LOGS) logs.pop();
}

export function getErrorLogs(): ErrorLog[] {
  return logs;
}

export function logSlowQuery(queryKey: string, durationMs: number) {
  if (durationMs > 1000) {
    addLog({
      type: "slow_query",
      message: `Slow query: ${queryKey} (${Math.round(durationMs)}ms)`,
    });
  }
}

export function logSupabaseError(operation: string, error: string) {
  if (shouldIgnore(error)) return;
  addLog({
    type: "supabase_error",
    message: `Supabase error in ${operation}`,
    details: error,
  });
  reportToServer(`Supabase: ${operation} — ${error}`);
}

export function initErrorLogger() {
  window.addEventListener("error", (event) => {
    if (shouldIgnore(event.message)) return;
    const details = `${event.filename}:${event.lineno}:${event.colno}`;
    addLog({
      type: "error",
      message: event.message || "Unknown error",
      details,
    });
    reportToServer(event.message || "Unknown error", event.error?.stack, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = `Unhandled promise rejection: ${reason?.message || String(reason)}`;
    if (shouldIgnore(msg)) return;
    addLog({ type: "error", message: msg });
    reportToServer(msg, reason?.stack);
  });
}
