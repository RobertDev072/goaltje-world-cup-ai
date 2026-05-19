/**
 * Maps the venue string in the matches table (e.g. "Mercedes-Benz Stadium, Atlanta")
 * to its Wikipedia article title. Used to fetch lead-image and short description
 * via the Wikipedia REST API.
 *
 * Photos shown are © Wikipedia contributors (CC BY-SA or public domain).
 * We always link to the source article so attribution is one click away.
 */

export const VENUE_WIKIPEDIA: Record<string, string> = {
  "Estadio Azteca, Mexico City":            "Estadio_Azteca",
  "Estadio Akron, Guadalajara":             "Estadio_Akron",
  "BMO Field, Toronto":                     "BMO_Field",
  "SoFi Stadium, Los Angeles":              "SoFi_Stadium",
  "Gillette Stadium, Foxborough":           "Gillette_Stadium",
  "MetLife Stadium, East Rutherford":       "MetLife_Stadium",
  "BC Place, Vancouver":                    "BC_Place",
  "Levi's Stadium, Santa Clara":            "Levi's_Stadium",
  "Lincoln Financial Field, Philadelphia":  "Lincoln_Financial_Field",
  "NRG Stadium, Houston":                   "NRG_Stadium",
  "AT&T Stadium, Arlington":                "AT&T_Stadium",
  "Estadio BBVA, Monterrey":                "Estadio_BBVA",
  "Hard Rock Stadium, Miami Gardens":       "Hard_Rock_Stadium",
  "Mercedes-Benz Stadium, Atlanta":         "Mercedes-Benz_Stadium",
  "Lumen Field, Seattle":                   "Lumen_Field",
  "Arrowhead Stadium, Kansas City":         "Arrowhead_Stadium",
};

/**
 * Resolve a (possibly partial) venue string to a Wikipedia article title.
 * Falls back to a fuzzy match on the stadium name (before the first comma).
 */
export function resolveWikipediaArticle(venue: string | null | undefined): string | null {
  if (!venue) return null;
  if (VENUE_WIKIPEDIA[venue]) return VENUE_WIKIPEDIA[venue];

  const stadiumOnly = venue.split(",")[0]?.trim();
  if (!stadiumOnly) return null;

  const match = Object.entries(VENUE_WIKIPEDIA).find(([key]) =>
    key.toLowerCase().startsWith(stadiumOnly.toLowerCase()),
  );
  return match ? match[1] : null;
}
