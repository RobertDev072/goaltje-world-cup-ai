import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompensationBanner, isCompensationVisible } from "@/components/CompensationBanner";
import { EarlyBirdStatus } from "@/components/EarlyBirdStatus";
import { WinShirtPromo } from "@/components/WinShirtPromo";

/**
 * Toont hooguit ÉÉN promo-banner tegelijk, op prioriteit, zodat de home
 * niet volloopt met stapelende kaarten:
 *   1. Compensatie (+10)      — zolang actief (verloopt 13 jun)
 *   2. Early Bird             — als 'ie relevant is voor deze gebruiker
 *   3. Win shirt              — anders
 *
 * De queries hier delen dezelfde react-query keys als de losse
 * componenten, dus er komen geen extra API-calls bij (cache-hit).
 */
export function HomePromos() {
  // 1. Compensatie — puur lokaal (localStorage + datum), synchroon
  if (isCompensationVisible()) {
    return <CompensationBanner />;
  }

  // 2. Early Bird — zelfde data als EarlyBirdStatus zelf gebruikt
  const { data: eb } = useQuery({
    queryKey: ["my-early-bird-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_early_bird_status");
      if (error) throw error;
      return data as {
        is_admin: boolean; earned: boolean;
        before_kickoff: boolean; predicted_count: number;
      };
    },
    staleTime: 60_000,
    retry: 0,
  });

  const earlyBirdRelevant =
    !!eb && !eb.is_admin &&
    (eb.earned || eb.before_kickoff || eb.predicted_count > 0);

  if (earlyBirdRelevant) {
    return <EarlyBirdStatus />;
  }

  // 3. Win shirt — fallback (verbergt zichzelf als gebruiker al gekwalificeerd is)
  return <WinShirtPromo />;
}
