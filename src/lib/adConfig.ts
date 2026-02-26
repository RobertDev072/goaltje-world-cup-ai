const STORAGE_KEY = "goaltje_ad_config";

export interface AdConfig {
  publisherId: string;
  slots: Record<string, string>; // label -> slot ID
}

const DEFAULT_CONFIG: AdConfig = {
  publisherId: "",
  slots: {},
};

export function getAdConfig(): AdConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveAdConfig(config: AdConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("ad-config-change", { detail: config }));
}
