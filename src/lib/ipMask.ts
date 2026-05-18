/**
 * Mask an IP address for display in admin UI.
 * IPv4: 12.34.56.78  → 12.34.56.x
 * IPv6: 2001:db8:..   → 2001:db8:x
 * Full IP stays in DB for security audits; we only mask in the UI layer.
 */
export function maskIp(ip: string | null | undefined): string {
  if (!ip) return "—";
  const trimmed = ip.trim();
  if (!trimmed) return "—";

  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    }
  }
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:x`;
    }
  }
  return "***";
}

const COUNTRY_NAME: Record<string, string> = {
  NL: "Nederland", BE: "België", DE: "Duitsland", FR: "Frankrijk",
  GB: "VK", US: "VS", ES: "Spanje", IT: "Italië", PT: "Portugal",
  PL: "Polen", TR: "Turkije", MA: "Marokko", SR: "Suriname",
  ID: "Indonesië", BR: "Brazilië", AR: "Argentinië", MX: "Mexico",
};

export function countryLabel(code: string | null | undefined): string {
  if (!code) return "";
  const upper = code.toUpperCase();
  const flag = countryFlag(upper);
  const name = COUNTRY_NAME[upper] || upper;
  return `${flag} ${name}`.trim();
}

export function countryFlag(code: string | null | undefined): string {
  if (!code) return "🌍";
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "🌍";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (upper.charCodeAt(0) - 65),
    base + (upper.charCodeAt(1) - 65),
  );
}
