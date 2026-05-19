/**
 * Client-side error logging — captures unhandled errors, slow queries, and failed Supabase calls.
 * Stores last N entries in memory for admin debug view.
 */

interface ErrorLog {
  timestamp: string;
  type: "error" | "slow_query" | "supabase_error";
  message: string;
  details?: string;
}

const MAX_LOGS = 100;
const logs: ErrorLog[] = [];

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
  addLog({
    type: "supabase_error",
    message: `Supabase error in ${operation}`,
    details: error,
  });
}

// Global error handler
const IGNORED_ERROR_PATTERNS: RegExp[] = [
  // Famous benign browser quirk — fires when ResizeObserver callbacks
  // trigger another layout change. No actual breakage. Common with
  // Radix UI / charts / three.js Canvas.
  /ResizeObserver loop/i,
  // Non-actionable: cancelled fetches, network aborts on navigation
  /AbortError/i,
  /The user aborted a request/i,
];

function shouldIgnore(message: string | undefined | null): boolean {
  if (!message) return false;
  return IGNORED_ERROR_PATTERNS.some((re) => re.test(message));
}

export function initErrorLogger() {
  window.addEventListener("error", (event) => {
    if (shouldIgnore(event.message)) return;
    addLog({
      type: "error",
      message: event.message || "Unknown error",
      details: `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg = `Unhandled promise rejection: ${event.reason?.message || String(event.reason)}`;
    if (shouldIgnore(msg)) return;
    addLog({
      type: "error",
      message: msg,
    });
  });
}
