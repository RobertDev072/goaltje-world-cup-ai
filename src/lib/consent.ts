const CONSENT_KEY = "goaltje_cookie_consent";

export type ConsentStatus = "granted" | "denied" | "pending";

export function getConsent(): ConsentStatus {
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "granted" || value === "denied") return value;
  return "pending";
}

export function setConsent(status: "granted" | "denied") {
  localStorage.setItem(CONSENT_KEY, status);
  window.dispatchEvent(new CustomEvent("consent-change", { detail: status }));
}
