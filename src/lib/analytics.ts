// Analytics event tracking utility — respects cookie consent
import { hasAnalyticsConsent } from "@/lib/consent";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (!hasAnalyticsConsent()) return;
  if (window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// Predefined conversion events
export const trackSignUp = () => trackEvent("SignUpCompleted");
export const trackPoolCreated = () => trackEvent("PoolCreated");
export const trackPoolJoined = () => trackEvent("PoolJoined");
export const trackFirstPrediction = () => trackEvent("FirstPredictionCreated");
