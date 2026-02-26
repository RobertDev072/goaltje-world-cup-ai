import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TiebreakerInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3 w-3" /> Rangorde uitleg
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-xs space-y-1.5" side="bottom" align="end">
        <p className="font-semibold text-sm mb-2">Hoe wordt de rangorde bepaald?</p>
        <ol className="space-y-1 list-decimal list-inside text-muted-foreground">
          <li><span className="text-foreground font-medium">Totaal punten</span> — hoogste eerst</li>
          <li><span className="text-foreground font-medium">Exacte scores</span> — meeste exact voorspelde uitslagen</li>
          <li><span className="text-foreground font-medium">Juiste resultaten</span> — meeste keer goede uitslag</li>
          <li><span className="text-foreground font-medium">Juiste doelpunten</span> — totaal correct voorspelde goals</li>
          <li><span className="text-foreground font-medium">Vroegste voorspelling</span> — wie het eerst correct voorspelde</li>
        </ol>
        <div className="border-t pt-1.5 mt-2">
          <p className="text-muted-foreground">
            <span className="font-medium text-primary">6 pt</span> exact · <span className="font-medium text-primary">4 pt</span> doelverschil · <span className="font-medium text-primary">3 pt</span> resultaat
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
