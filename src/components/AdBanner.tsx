import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Replace with your actual AdSense Publisher ID
const ADSENSE_PUB_ID = "ca-pub-XXXXXXXXXXXXXXXX";

type AdFormat = "horizontal" | "rectangle" | "vertical";

interface AdBannerProps {
  slot: string; // Your ad unit slot ID from AdSense
  format?: AdFormat;
  className?: string;
}

const FORMAT_STYLES: Record<AdFormat, string> = {
  horizontal: "min-h-[90px]",
  rectangle: "min-h-[250px]",
  vertical: "min-h-[600px]",
};

// Track if the script has been loaded globally
let scriptLoaded = false;

function loadAdSenseScript() {
  if (scriptLoaded) return;
  if (document.querySelector(`script[src*="adsbygoogle"]`)) {
    scriptLoaded = true;
    return;
  }

  const script = document.createElement("script");
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`;
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
  scriptLoaded = true;
}

export function AdBanner({ slot, format = "horizontal", className }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    loadAdSenseScript();

    // Push ad after a short delay to ensure script is loaded
    const timer = setTimeout(() => {
      if (pushed.current) return;
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        // AdSense not ready yet or blocked by ad blocker
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Don't render in development/preview mode (ads won't work anyway)
  const isDev = window.location.hostname.includes("lovable") || 
                window.location.hostname === "localhost";

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
