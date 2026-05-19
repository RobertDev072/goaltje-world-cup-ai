/**
 * Per-stadium profile for the 3D visualiser. Colors and roof state
 * are based on Wikipedia photo references of each venue. Not
 * architecturally exact, but each stadium has its own palette and
 * (for 5 iconic venues) a unique architectural signature.
 */

export type RoofKind =
  | "open"
  | "closed"
  | "retractable"
  | "dome-cable"
  | "partial-canopy"
  | "floating-canopy"
  | "pinwheel"
  | "twin-arch";

export type BowlShape = "oval" | "rounded-rect";

export interface StadiumProfile {
  key: string;
  name: string;
  matches: string[];           // case-insensitive substrings matched against `venue` column
  roof: RoofKind;
  bowlShape: BowlShape;
  exteriorColor: string;       // outer bowl wall + louver tint
  louverColor: string;         // vertical fin color
  accentColor: string;         // upper tier seats
  suiteColor: string;          // dark glass band
  ribbonColor: string;         // LED ribbon emissive
  scoreboardColor: string;     // LED scoreboard emissive
  roofColor: string;           // roof membrane / truss
  signatureNote?: string;      // short tooltip text
}

export const STADIUM_PROFILES: StadiumProfile[] = [
  {
    key: "att",
    name: "AT&T Stadium",
    matches: ["at&t", "arlington"],
    roof: "twin-arch",
    bowlShape: "rounded-rect",
    exteriorColor: "#b8bcc2",
    louverColor: "#d8dde6",
    accentColor: "#3a4250",
    suiteColor: "#0a1224",
    ribbonColor: "#0b3d91",
    scoreboardColor: "#0b3d91",
    roofColor: "#e6e9ef",
    signatureNote: "Twin 292ft steel arches",
  },
  {
    key: "mercedes-benz",
    name: "Mercedes-Benz Stadium",
    matches: ["mercedes-benz", "atlanta"],
    roof: "pinwheel",
    bowlShape: "rounded-rect",
    exteriorColor: "#d9d4cb",
    louverColor: "#3a3f47",
    accentColor: "#2a2f36",
    suiteColor: "#0a0b0d",
    ribbonColor: "#ffd700",
    scoreboardColor: "#c8102e",
    roofColor: "#e8e4dd",
    signatureNote: "8-blade pinwheel oculus",
  },
  {
    key: "gillette",
    name: "Gillette Stadium",
    matches: ["gillette", "foxborough"],
    roof: "partial-canopy",
    bowlShape: "rounded-rect",
    exteriorColor: "#8b1f2b",
    louverColor: "#6e6e6e",
    accentColor: "#0a1d3f",
    suiteColor: "#03102b",
    ribbonColor: "#c8102e",
    scoreboardColor: "#0a1d3f",
    roofColor: "#f4f4f0",
    signatureNote: "218ft lighthouse + bridge",
  },
  {
    key: "hard-rock",
    name: "Hard Rock Stadium",
    matches: ["hard rock", "miami"],
    roof: "floating-canopy",
    bowlShape: "rounded-rect",
    exteriorColor: "#d8dde2",
    louverColor: "#e1e6ee",
    accentColor: "#00a3b4",
    suiteColor: "#001a26",
    ribbonColor: "#f47b20",
    scoreboardColor: "#00a3b4",
    roofColor: "#e8edf2",
    signatureNote: "Floating ring canopy",
  },
  {
    key: "arrowhead",
    name: "Arrowhead Stadium",
    matches: ["arrowhead", "kansas city"],
    roof: "open",
    bowlShape: "rounded-rect",
    exteriorColor: "#c8102e",
    louverColor: "#e63a52",
    accentColor: "#7a0f1f",
    suiteColor: "#1d0306",
    ribbonColor: "#ffb612",
    scoreboardColor: "#c8102e",
    roofColor: "#7a0f1f",
  },
  {
    key: "sofi",
    name: "SoFi Stadium",
    matches: ["sofi", "los angeles", "inglewood"],
    roof: "floating-canopy",
    bowlShape: "rounded-rect",
    exteriorColor: "#e8e8ea",
    louverColor: "#dadce0",
    accentColor: "#4a5560",
    suiteColor: "#0d1320",
    ribbonColor: "#ffffff",
    scoreboardColor: "#ff3366",
    roofColor: "#f0f3f8",
    signatureNote: "Floating ETFE shell",
  },
  {
    key: "metlife",
    name: "MetLife Stadium",
    matches: ["metlife", "east rutherford"],
    roof: "open",
    bowlShape: "rounded-rect",
    exteriorColor: "#c9ccd1",
    louverColor: "#d8dde6",
    accentColor: "#1c2840",
    suiteColor: "#0a1124",
    ribbonColor: "#2b6cb0",
    scoreboardColor: "#2b6cb0",
    roofColor: "#cfd4dc",
    signatureNote: "Color-changing louvers",
  },
  {
    key: "lincoln-financial",
    name: "Lincoln Financial Field",
    matches: ["lincoln financial", "philadelphia"],
    roof: "partial-canopy",
    bowlShape: "rounded-rect",
    exteriorColor: "#8a3324",
    louverColor: "#4a4d52",
    accentColor: "#004c54",
    suiteColor: "#001a1d",
    ribbonColor: "#a5acaf",
    scoreboardColor: "#004c54",
    roofColor: "#4a5159",
  },
  {
    key: "levis",
    name: "Levi's Stadium",
    matches: ["levi's", "levis", "santa clara"],
    roof: "partial-canopy",
    bowlShape: "rounded-rect",
    exteriorColor: "#6e7480",
    louverColor: "#9aa3ad",
    accentColor: "#4a7c3a",
    suiteColor: "#1a2615",
    ribbonColor: "#c8102e",
    scoreboardColor: "#c8102e",
    roofColor: "#4a7c3a",
    signatureNote: "Living-roof suite tower",
  },
  {
    key: "lumen",
    name: "Lumen Field",
    matches: ["lumen", "seattle"],
    roof: "twin-arch",
    bowlShape: "rounded-rect",
    exteriorColor: "#d49a7a",
    louverColor: "#a8a8a8",
    accentColor: "#002244",
    suiteColor: "#000a14",
    ribbonColor: "#69be28",
    scoreboardColor: "#002244",
    roofColor: "#2b4d8e",
    signatureNote: "Twin 720ft tied arches",
  },
  {
    key: "nrg",
    name: "NRG Stadium",
    matches: ["nrg", "houston"],
    roof: "retractable",
    bowlShape: "rounded-rect",
    exteriorColor: "#c4c8cc",
    louverColor: "#dadce0",
    accentColor: "#3b4a5a",
    suiteColor: "#020c12",
    ribbonColor: "#c8102e",
    scoreboardColor: "#3b4a5a",
    roofColor: "#dadde2",
  },
  {
    key: "bmo",
    name: "BMO Field",
    matches: ["bmo", "toronto"],
    roof: "partial-canopy",
    bowlShape: "rounded-rect",
    exteriorColor: "#c8102e",
    louverColor: "#b8b8b8",
    accentColor: "#7a0f1c",
    suiteColor: "#1a0306",
    ribbonColor: "#c8102e",
    scoreboardColor: "#c8102e",
    roofColor: "#b8b8b8",
  },
  {
    key: "bc-place",
    name: "BC Place",
    matches: ["bc place", "vancouver"],
    roof: "dome-cable",
    bowlShape: "oval",
    exteriorColor: "#f0f0ec",
    louverColor: "#dfe3ea",
    accentColor: "#9a1f2c",
    suiteColor: "#1a0e10",
    ribbonColor: "#9a1f2c",
    scoreboardColor: "#9a1f2c",
    roofColor: "#fafbfd",
    signatureNote: "36 masts + cable sail",
  },
  {
    key: "akron",
    name: "Estadio Akron",
    matches: ["akron", "guadalajara"],
    roof: "partial-canopy",
    bowlShape: "oval",
    exteriorColor: "#6fae54",
    louverColor: "#8ac972",
    accentColor: "#b81f2a",
    suiteColor: "#1a0a0c",
    ribbonColor: "#b81f2a",
    scoreboardColor: "#b81f2a",
    roofColor: "#f4f4f0",
    signatureNote: "Grass-covered 'volcano'",
  },
  {
    key: "azteca",
    name: "Estadio Banorte (Azteca)",
    matches: ["azteca", "mexico city", "banorte"],
    roof: "partial-canopy",
    bowlShape: "oval",
    exteriorColor: "#8a8580",
    louverColor: "#a8a39e",
    accentColor: "#0a3a8a",
    suiteColor: "#02112a",
    ribbonColor: "#ffd700",
    scoreboardColor: "#0a3a8a",
    roofColor: "#c8102e",
    signatureNote: "Concrete brutalism + red ETFE",
  },
  {
    key: "bbva",
    name: "Estadio BBVA",
    matches: ["bbva", "monterrey"],
    roof: "partial-canopy",
    bowlShape: "rounded-rect",
    exteriorColor: "#a8acb0",
    louverColor: "#4a4f55",
    accentColor: "#003da5",
    suiteColor: "#001528",
    ribbonColor: "#ffffff",
    scoreboardColor: "#003da5",
    roofColor: "#5a6068",
    signatureNote: "Mountain-silhouette steel",
  },
];

const DEFAULT_PROFILE: StadiumProfile = {
  key: "default",
  name: "Stadion",
  matches: [],
  roof: "open",
  bowlShape: "rounded-rect",
  exteriorColor: "#5a6373",
  louverColor: "#c7d0dc",
  accentColor: "#2e3a4e",
  suiteColor: "#0d1320",
  ribbonColor: "#ff7a00",
  scoreboardColor: "#ff8a00",
  roofColor: "#d4d7dc",
};

export function lookupStadiumProfile(venueName: string | null | undefined): StadiumProfile {
  if (!venueName) return DEFAULT_PROFILE;
  const v = venueName.toLowerCase();
  for (const p of STADIUM_PROFILES) {
    if (p.matches.some((m) => v.includes(m))) return p;
  }
  return DEFAULT_PROFILE;
}
