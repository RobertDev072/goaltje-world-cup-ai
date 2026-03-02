import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorLogger } from "./lib/errorLogger";

// Initialize client-side error logging
initErrorLogger();

// Restore theme preference (light is default)
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

// Webview detection for DreamFlow
const isWebView = /(DreamFlow|wv|WebView)/i.test(navigator.userAgent) ||
  window.matchMedia('(display-mode: standalone)').matches;
if (isWebView) {
  document.documentElement.classList.add("webview");
}

createRoot(document.getElementById("root")!).render(<App />);
