/**
 * Gedeelde "actieve poule"-keuze over alle pagina's heen.
 *
 * Voorheen koos elke pagina los z'n eigen pool (vaak myPools[0]),
 * waardoor de match-detail de leden van een andere poule toonde dan
 * waar de gebruiker net was. Door de keuze in localStorage te bewaren
 * gebruiken Home, Matches en MatchDetail dezelfde poule.
 */
const KEY = "goaltje_active_pool";

export function getActivePoolId(): string {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setActivePoolId(poolId: string) {
  try {
    if (poolId) localStorage.setItem(KEY, poolId);
  } catch {
    /* ignore */
  }
}
