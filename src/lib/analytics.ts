// Google Ads / Analytics event tracking utility
// Configure GOOGLE_ADS_ID via gtag in index.html

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// Predefined conversion events
export const trackSignUp = () => trackEvent("SignUpCompleted");
export const trackPoolCreated = () => trackEvent("PoolCreated");
export const trackPoolJoined = () => trackEvent("PoolJoined");
export const trackFirstPrediction = () => trackEvent("FirstPredictionCreated");
