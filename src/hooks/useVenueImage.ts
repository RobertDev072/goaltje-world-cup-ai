import { useQuery } from "@tanstack/react-query";
import { resolveWikipediaArticle } from "@/lib/venueMapping";

export interface VenueImage {
  thumbnail: string;
  original: string;
  articleUrl: string;
  description: string;
  title: string;
}

/**
 * Fetches the lead image + short description for a stadium via the public
 * Wikipedia REST API. CORS-enabled. Cached for 7 days via React Query.
 *
 * Returns null when:
 *   - venue is unknown / not in our mapping
 *   - Wikipedia article has no lead image
 *   - network failed
 */
export function useVenueImage(venue: string | null | undefined) {
  return useQuery<VenueImage | null>({
    queryKey: ["venue-image", venue],
    queryFn: async () => {
      const title = resolveWikipediaArticle(venue || "");
      if (!title) return null;

      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return null;

      const data = await res.json();
      const original = data?.originalimage?.source as string | undefined;
      const thumb    = data?.thumbnail?.source as string | undefined;
      if (!original && !thumb) return null;

      return {
        thumbnail:  thumb || original!,
        original:   original || thumb!,
        articleUrl: data?.content_urls?.desktop?.page
          || `https://en.wikipedia.org/wiki/${title}`,
        description: data?.extract || data?.description || "",
        title:       data?.titles?.normalized || title.replace(/_/g, " "),
      };
    },
    enabled: !!venue,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime:    7 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
