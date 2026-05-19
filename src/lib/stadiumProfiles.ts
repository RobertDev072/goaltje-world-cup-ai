/**
 * Per-stadium profile for the 3D visualiser. Colors and roof state
 * are inspired by Wikipedia photos of each venue. Not architecturally
 * exact — the same procedural bowl model is reused, but each stadium
 * has its own palette so they read differently.
 */

export type RoofKind = "open" | "closed" | "retractable" | "dome-cable";

export interface StadiumProfile {
  key: string;                 // unique slug, used as render seed
  name: string;                // display name
  matches: string[];           // case-insensitive substrings matched against `venue` column
  roof: RoofKind;
  exteriorColor: string;       // outer bowl wall + louver tint
  louverColor: string;         // vertical fin color
  accentColor: string;         // upper tier seats
  suiteColor: string;          // dark glass band
  ribbonColor: string;         // LED ribbon emissive
  scoreboardColor: string;     // LED scoreboard emissive
  roofColor: string;           // roof membrane / truss
}

export const STADIUM_PROFILES: StadiumProfile[] = [
  {
    key: "metlife",
    name: "MetLife Stadium",
    matches: ["metlife", "east rutherford"],
    roof: "open",
    exteriorColor: "#7d8696",
    louverColor: "#c7d0dc",
    accentColor: "#1c2840",
    suiteColor: "#0a1124",
    ribbonColor: "#3a86ff",
    scoreboardColor: "#3a86ff",
    roofColor: "#cfd4dc",
  },
  {
    key: "att",
    name: "AT&T Stadium",
    matches: ["at&t", "arlington"],
    roof: "retractable",
    exteriorColor: "#5a6373",
    louverColor: "#d8dde6",
    accentColor: "#1b2840",
    suiteColor: "#0a1224",
    ribbonColor: "#0b3d91",
    scoreboardColor: "#0b3d91",
    roofColor: "#e6e9ef",
  },
  {
    key: "mercedes-benz",
    name: "Mercedes-Benz Stadium",
    matches: ["mercedes-benz", "atlanta"],
    roof: "retractable",
    exteriorColor: "#2d2f33",
    louverColor: "#4b4f56",
    accentColor: "#1a1c20",
    suiteColor: "#0a0b0d",
    ribbonColor: "#ffd700",
    scoreboardColor: "#c8102e",
    roofColor: "#2a2c30",
  },
  {
    key: "sofi",
    name: "SoFi Stadium",
    matches: ["sofi", "los angeles"],
    roof: "retractable",
    exteriorColor: "#9aa2ad",
    louverColor: "#e1e6ee",
    accentColor: "#2a3142",
    suiteColor: "#0d1320",
    ribbonColor: "#ffffff",
    scoreboardColor: "#ff3366",
    roofColor: "#f0f3f8",
  },
  {
    key: "hard-rock",
    name: "Hard Rock Stadium",
    matches: ["hard rock", "miami"],
    roof: "open",
    exteriorColor: "#ff7a1a",
    louverColor: "#ffa15c",
    accentColor: "#003a4d",
    suiteColor: "#001a26",
    ribbonColor: "#00cfd1",
    scoreboardColor: "#ff7a1a",
    roofColor: "#ff8a33",
  },
  {
    key: "gillette",
    name: "Gillette Stadium",
    matches: ["gillette", "foxborough"],
    roof: "open",
    exteriorColor: "#5a6373",
    louverColor: "#c2c8d2",
    accentColor: "#0a1d3f",
    suiteColor: "#03102b",
    ribbonColor: "#c8102e",
    scoreboardColor: "#0a1d3f",
    roofColor: "#cfd4dc",
  },
  {
    key: "arrowhead",
    name: "Arrowhead Stadium",
    matches: ["arrowhead", "kansas city"],
    roof: "open",
    exteriorColor: "#c8102e",
    louverColor: "#e63a52",
    accentColor: "#7a0f1f",
    suiteColor: "#1d0306",
    ribbonColor: "#ffd700",
    scoreboardColor: "#c8102e",
    roofColor: "#7a0f1f",
  },
  {
    key: "lincoln-financial",
    name: "Lincoln Financial Field",
    matches: ["lincoln financial", "philadelphia"],
    roof: "open",
    exteriorColor: "#3f4651",
    louverColor: "#9aa3b0",
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
    roof: "open",
    exteriorColor: "#8a9099",
    louverColor: "#c1c5cc",
    accentColor: "#aa0000",
    suiteColor: "#1a0303",
    ribbonColor: "#b3995d",
    scoreboardColor: "#aa0000",
    roofColor: "#9aa3ad",
  },
  {
    key: "lumen",
    name: "Lumen Field",
    matches: ["lumen", "seattle"],
    roof: "open",
    exteriorColor: "#3f4651",
    louverColor: "#7a8390",
    accentColor: "#002244",
    suiteColor: "#000a14",
    ribbonColor: "#69be28",
    scoreboardColor: "#002244",
    roofColor: "#4a5159",
  },
  {
    key: "nrg",
    name: "NRG Stadium",
    matches: ["nrg", "houston"],
    roof: "retractable",
    exteriorColor: "#5a6373",
    louverColor: "#c2c8d2",
    accentColor: "#03202f",
    suiteColor: "#020c12",
    ribbonColor: "#c8102e",
    scoreboardColor: "#03202f",
    roofColor: "#dadde2",
  },
  {
    key: "bmo",
    name: "BMO Field",
    matches: ["bmo", "toronto"],
    roof: "open",
    exteriorColor: "#7a8590",
    louverColor: "#c5cbd3",
    accentColor: "#c8102e",
    suiteColor: "#1a0306",
    ribbonColor: "#c8102e",
    scoreboardColor: "#c8102e",
    roofColor: "#9aa3ad",
  },
  {
    key: "bc-place",
    name: "BC Place",
    matches: ["bc place", "vancouver"],
    roof: "dome-cable",
    exteriorColor: "#eef0f4",
    louverColor: "#dfe3ea",
    accentColor: "#9a1f2c",
    suiteColor: "#1a0e10",
    ribbonColor: "#9a1f2c",
    scoreboardColor: "#9a1f2c",
    roofColor: "#ffffff",
  },
  {
    key: "akron",
    name: "Estadio Akron",
    matches: ["akron", "guadalajara"],
    roof: "open",
    exteriorColor: "#3a5a3a",
    louverColor: "#5a7a5a",
    accentColor: "#c4242d",
    suiteColor: "#0a1a0a",
    ribbonColor: "#c4242d",
    scoreboardColor: "#c4242d",
    roofColor: "#6a8a6a",
  },
  {
    key: "azteca",
    name: "Estadio Azteca",
    matches: ["azteca", "mexico city", "banorte"],
    roof: "open",
    exteriorColor: "#9d9d9d",
    louverColor: "#bdbdbd",
    accentColor: "#0a3a8a",
    suiteColor: "#02112a",
    ribbonColor: "#ffd700",
    scoreboardColor: "#0a3a8a",
    roofColor: "#a5a5a5",
  },
  {
    key: "bbva",
    name: "Estadio BBVA",
    matches: ["bbva", "monterrey"],
    roof: "open",
    exteriorColor: "#3a3f47",
    louverColor: "#7d8390",
    accentColor: "#004f9f",
    suiteColor: "#001528",
    ribbonColor: "#ffffff",
    scoreboardColor: "#004f9f",
    roofColor: "#5a6068",
  },
];

const DEFAULT_PROFILE: StadiumProfile = {
  key: "default",
  name: "Stadion",
  matches: [],
  roof: "open",
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
