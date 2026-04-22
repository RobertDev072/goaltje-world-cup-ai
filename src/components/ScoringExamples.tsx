import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Example {
  actual: string;
  guess: string;
  points: number;
  label: string;
  why: string;
}

const SCENARIO_1: Example[] = [
  { actual: "3-1", guess: "3-1", points: 6, label: "Exact", why: "Je tipt precies de juiste uitslag" },
  { actual: "3-1", guess: "2-0", points: 4, label: "Doelverschil", why: "Winnaar klopt + zelfde doelverschil (+2)" },
  { actual: "3-1", guess: "1-0", points: 3, label: "Uitslag", why: "Winnaar klopt maar doelverschil niet (+2 vs +1)" },
  { actual: "3-1", guess: "2-2", points: 0, label: "Fout", why: "Jij tipt gelijkspel, werd thuis-winst" },
];

const SCENARIO_2: Example[] = [
  { actual: "1-1", guess: "1-1", points: 6, label: "Exact", why: "Precies de juiste score" },
  { actual: "1-1", guess: "2-2", points: 3, label: "Uitslag", why: "Jij tipt gelijk, werd ook gelijk (geen exact)" },
  { actual: "1-1", guess: "2-1", points: 0, label: "Fout", why: "Jij tipt thuis-winst, werd gelijk" },
];

const SCENARIO_3: Example[] = [
  { actual: "0-2", guess: "0-2", points: 6, label: "Exact", why: "Precies de juiste score" },
  { actual: "0-2", guess: "1-3", points: 4, label: "Doelverschil", why: "Uit-winst met verschil 2 ✓" },
  { actual: "0-2", guess: "0-3", points: 3, label: "Uitslag", why: "Uit wint, maar verschil klopt niet (2 vs 3)" },
];

function ExampleRow({ ex }: { ex: Example }) {
  const isZero = ex.points === 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2",
        isZero ? "bg-destructive/5 border-destructive/20" : "bg-success/5 border-success/20",
      )}
    >
      <span className="font-mono text-xs text-muted-foreground shrink-0 w-12 text-right">
        {ex.guess}
      </span>
      <span className={cn("shrink-0", isZero ? "text-destructive" : "text-success")}>
        {isZero ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      </span>
      <div className="flex-1 min-w-0 text-[11px]">
        <p className="font-medium text-foreground">{ex.label} — {ex.why}</p>
      </div>
      <div
        className={cn(
          "shrink-0 font-bold font-display text-sm rounded-full px-2.5 py-0.5 tabular-nums",
          ex.points === 6 && "bg-primary/10 text-primary",
          ex.points === 4 && "bg-secondary/20 text-warning",
          ex.points === 3 && "bg-accent/10 text-accent",
          ex.points === 0 && "bg-muted text-muted-foreground",
        )}
      >
        {ex.points}pt
      </div>
    </div>
  );
}

function Scenario({ title, actual, examples }: { title: string; actual: string; examples: Example[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{title}</span>
        <span className="font-bold font-display bg-foreground text-background rounded-full px-2.5 py-0.5 tabular-nums">
          {actual}
        </span>
      </div>
      <div className="space-y-1.5">
        {examples.map((ex, i) => (
          <ExampleRow key={i} ex={ex} />
        ))}
      </div>
    </div>
  );
}

export function ScoringExamples() {
  return (
    <div className="space-y-4">
      {/* Points summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="font-display font-black text-2xl text-primary">6</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Exact</p>
            <p className="text-[10px] text-muted-foreground mt-1">precieze score</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-secondary/10">
          <CardContent className="p-3 text-center">
            <p className="font-display font-black text-2xl text-warning">4</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Doelverschil</p>
            <p className="text-[10px] text-muted-foreground mt-1">winnaar + verschil</p>
          </CardContent>
        </Card>
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-3 text-center">
            <p className="font-display font-black text-2xl text-accent">3</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Uitslag</p>
            <p className="text-[10px] text-muted-foreground mt-1">alleen winnaar</p>
          </CardContent>
        </Card>
      </div>

      {/* Belangrijke regel */}
      <Card className="border-0 bg-muted/50">
        <CardContent className="p-3 flex items-start gap-2">
          <span className="text-base shrink-0">💡</span>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Punten stapelen niet.</strong> Je krijgt alleen de <strong>hoogste</strong> categorie die van toepassing is. Een exacte score geeft dus 6 punten, niet 6+4+3.
          </p>
        </CardContent>
      </Card>

      {/* Concrete voorbeelden */}
      <Card className="border-0 shadow-elevation-2">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="font-display font-bold text-sm mb-1">Concrete voorbeelden</h3>
            <p className="text-[11px] text-muted-foreground">Hoeveel punten krijg jij bij verschillende voorspellingen?</p>
          </div>

          <Scenario
            title="De echte uitslag is:"
            actual="NED 3-1 BRA"
            examples={SCENARIO_1}
          />

          <div className="h-px bg-border/60" />

          <Scenario
            title="De echte uitslag is:"
            actual="1-1 (gelijk)"
            examples={SCENARIO_2}
          />

          <div className="h-px bg-border/60" />

          <Scenario
            title="De echte uitslag is:"
            actual="0-2"
            examples={SCENARIO_3}
          />
        </CardContent>
      </Card>

      {/* Quick-FAQ voor veel gestelde "maar wat als..."-vragen */}
      <Card className="border-0 shadow-elevation-1">
        <CardContent className="p-4 space-y-3 text-[12px]">
          <h3 className="font-display font-bold text-sm">Veel-gestelde vragen</h3>

          <div className="space-y-2">
            <div>
              <p className="font-semibold text-foreground">Waarom krijg ik geen doelverschil-punten bij gelijkspel?</p>
              <p className="text-muted-foreground">
                Bij gelijkspel is het doelverschil altijd 0. Als jij 2-2 tipt en het wordt 1-1, klopt de winnaar (niemand) maar niet de exacte score — je krijgt dan 3 punten (uitslag), niet 4.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Wat als ik niet voorspel?</p>
              <p className="text-muted-foreground">
                Geen voorspelling = 0 punten voor die match. Zorg dat je op tijd invult vóór de aftrap.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Wat als twee mensen evenveel punten hebben?</p>
              <p className="text-muted-foreground">
                De tiebreaker: wie <strong>meer exacte scores</strong> heeft staat hoger. Daarna telt het totaal aantal goed voorspelde goals.
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Wanneer sluit een voorspelling?</p>
              <p className="text-muted-foreground">
                Op het moment van de aftrap. Daarna kun je niet meer wijzigen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
