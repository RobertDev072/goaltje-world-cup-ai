import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getConsent, type ConsentStatus } from "@/lib/consent";
const ADSENSE_PUB_ID = "ca-pub-1329101419131535";

type AdFormat = "horizontal" | "rectangle" | "vertical";

interface AdBannerProps {
  slot: string;
  format?: AdFormat;
  className?: string;
}

const FORMAT_STYLES: Record<AdFormat, string> = {
  horizontal: "min-h-[90px]",
  rectangle: "min-h-[250px]",
  vertical: "min-h-[600px]",
};

let scriptLoaded = false;

function loadAdSenseScript(pubId: string) {
  if (scriptLoaded) return;
  if (document.querySelector(`script[src*="adsbygoogle"]`)) {
    scriptLoaded = true;
    return;
  }
  const script = document.createElement("script");
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
  scriptLoaded = true;
}

export function AdBanner({ slot, format = "horizontal", className }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [consent, setConsentState] = useState<ConsentStatus>(getConsent);

  // Listen for consent changes
  useEffect(() => {
    const handler = (e: Event) => setConsentState((e as CustomEvent).detail);
    window.addEventListener("consent-change", handler);
    return () => window.removeEventListener("consent-change", handler);
  }, []);

  useEffect(() => {
    if (consent !== "granted") return;

    const isDev = window.location.hostname.includes("lovable") || window.location.hostname === "localhost";
    if (isDev) return;

    // Script is already in index.html, just mark as loaded
    scriptLoaded = true;

    const timer = setTimeout(() => {
      if (pushed.current) return;
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        // AdSense not ready or ad blocker
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [consent]);

  const isDev = window.location.hostname.includes("lovable") || window.location.hostname === "localhost";

  // In dev mode, always show placeholder
  if (isDev) {
    return (
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-muted-foreground/40 text-xs font-medium bg-muted/30",
          FORMAT_STYLES[format],
          className
        )}
      >
        📢 Advertentie ({format})
      </div>
    );
  }

  // No consent yet → render nothing (no tracking before consent)
  if (consent !== "granted") return null;

  return (
    <div ref={adRef} className={cn("overflow-hidden", FORMAT_STYLES[format], className)}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_PUB_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
