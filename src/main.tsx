import { createRoot } from "react-dom/client";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import App from "./App.tsx";
import "./index.css";
import { initErrorLogger } from "./lib/errorLogger";

// Vlaggen-emoji's renderen niet op Windows desktop. Polyfill laadt een Twemoji-
// webfont alleen op browsers die het nodig hebben (no-op op iOS/Android/macOS).
polyfillCountryFlagEmojis();

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
