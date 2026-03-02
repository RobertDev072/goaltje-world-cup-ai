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
export function initErrorLogger() {
  window.addEventListener("error", (event) => {
    addLog({
      type: "error",
      message: event.message || "Unknown error",
      details: `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    addLog({
      type: "error",
      message: `Unhandled promise rejection: ${event.reason?.message || String(event.reason)}`,
    });
  });
}
