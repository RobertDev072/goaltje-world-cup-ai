const CONSENT_KEY = "goaltje_cookie_consent";
const CONSENT_CATEGORIES_KEY = "goaltje_cookie_categories";

export type ConsentStatus = "granted" | "denied" | "pending";

export interface ConsentCategories {
  necessary: true; // Always true, cannot be toggled
  analytics: boolean;
  functional: boolean;
}

const DEFAULT_CATEGORIES: ConsentCategories = {
  necessary: true,
  analytics: false,
  functional: false,
};

export function getConsent(): ConsentStatus {
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "granted" || value === "denied") return value;
  return "pending";
}

export function getConsentCategories(): ConsentCategories {
  try {
    const raw = localStorage.getItem(CONSENT_CATEGORIES_KEY);
    if (raw) return { ...DEFAULT_CATEGORIES, ...JSON.parse(raw), necessary: true };
  } catch {}
  return DEFAULT_CATEGORIES;
}

export function setConsent(status: "granted" | "denied", categories?: Partial<ConsentCategories>) {
  localStorage.setItem(CONSENT_KEY, status);

  const cats: ConsentCategories = status === "denied"
    ? DEFAULT_CATEGORIES
    : { necessary: true, analytics: categories?.analytics ?? true, functional: categories?.functional ?? true };

  localStorage.setItem(CONSENT_CATEGORIES_KEY, JSON.stringify(cats));
  window.dispatchEvent(new CustomEvent("consent-change", { detail: { status, categories: cats } }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === "granted" && getConsentCategories().analytics;
}

export function hasFunctionalConsent(): boolean {
  return getConsent() === "granted" && getConsentCategories().functional;
}