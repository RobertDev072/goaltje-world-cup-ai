import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Trophy, Target, Lightbulb, Flag, TrendingUp, Share2 } from "lucide-react";
import goaltjeLogo from "@/assets/goaltje-logo.png";

const articles: Record<string, {
  title: string;
  metaTitle: string;
  metaDesc: string;
  keywords: string;
  heroColor: string;
  icon: any;
  date: string;
  readTime: string;
  sections: { heading: string; content: string }[];
}> = {
  "wk-2026-speelschema": {
    title: "WK 2026 Speelschema: Alle 104 wedstrijden op een rij",
    metaTitle: "WK 2026 Speelschema – Alle 104 wedstrijden, data & speelsteden | Goaltje",
    metaDesc: "Compleet overzicht van het WK 2026 speelschema. 104 wedstrijden, 48 landen, 16 stadions in de VS, Mexico en Canada. Bekijk alle data en tijden.",
    keywords: "wk 2026 speelschema, world cup 2026 schedule, wk 2026 wedstrijden, wk 2026 programma, wk voetbal 2026",
    heroColor: "from-blue-600 to-cyan-500",
    icon: Calendar,
    date: "2026-02-27",
    readTime: "6 min",
    sections: [
      {
        heading: "Het grootste WK ooit",
        content: "Het WK 2026 wordt het grootste voetbaltoernooi aller tijden. Met 48 deelnemende landen, 12 groepen en maar liefst 104 wedstrijden belooft het een onvergetelijk spektakel te worden. Het toernooi wordt georganiseerd door drie landen: de Verenigde Staten, Mexico en Canada."
      },
      {
        heading: "Wanneer is het WK 2026?",
        content: "Het WK 2026 begint op 11 juni 2026 en eindigt met de finale op 19 juli 2026. De openingswedstrijd wordt gespeeld in het Estadio Azteca in Mexico-Stad, een van de meest iconische voetbalstadions ter wereld. De finale vindt plaats in het MetLife Stadium in New Jersey, vlakbij New York City."
      },
      {
        heading: "Groepsfase: 12 groepen van 4",
        content: "In de groepsfase worden 48 landen verdeeld over 12 groepen van 4 teams. Elke groep speelt een volledige competitie (6 wedstrijden per groep). De nummers 1 en 2 van elke groep gaan door naar de knockoutfase, aangevuld met de 8 beste nummers 3. Dat levert een spannende en onvoorspelbare groepsfase op met 96 groepswedstrijden in totaal."
      },
      {
        heading: "Knockoutfase: van 32 naar 1",
        content: "Na de groepsfase volgt een knockoutfase met 32 teams. Dit betekent een extra ronde ten opzichte van eerdere WK's. De route naar de finale bestaat uit: achtste finales (16 wedstrijden), kwartfinales (8), halve finales (4), troostfinale en de grote finale. In totaal zijn er 8 extra wedstrijden vergeleken met het WK 2022."
      },
      {
        heading: "Alle wedstrijden volgen met Goaltje",
        content: "Met Goaltje kun je alle 104 wedstrijden volgen, voorspellingen doen en punten verdienen in je eigen poule. De app biedt real-time score-updates, een live ranglijst en automatische puntentelling. Maak gratis een account aan en start je eigen WK-poule!"
      }
    ]
  },
  "wk-2026-format-48-landen": {
    title: "Nieuw WK-format 2026: 48 landen, 12 groepen – wat verandert er?",
    metaTitle: "WK 2026 Format – 48 landen, 12 groepen uitgelegd | Goaltje",
    metaDesc: "Het WK 2026 heeft een nieuw format met 48 landen en 12 groepen. Lees hoe de groepsfase, knockoutronde en kwalificatie werken.",
    keywords: "wk 2026 format, 48 landen wk, wk 2026 groepen, world cup 2026 format, wk 2026 regels",
    heroColor: "from-purple-600 to-pink-500",
    icon: TrendingUp,
    date: "2026-02-25",
    readTime: "5 min",
    sections: [
      {
        heading: "Van 32 naar 48 landen",
        content: "FIFA heeft besloten het WK uit te breiden van 32 naar 48 deelnemende landen. Dit is de grootste verandering in het toernooi sinds 1998, toen het van 24 naar 32 teams ging. De uitbreiding geeft meer landen uit Afrika, Azië en Noord-Amerika de kans om deel te nemen aan het grootste voetbalevenement ter wereld."
      },
      {
        heading: "12 groepen van 4 teams",
        content: "Het nieuwe format bestaat uit 12 groepen van 4 teams. Elke groep speelt een volledige competitie, wat betekent dat elk team 3 groepswedstrijden speelt. De nummers 1 en 2 gaan automatisch door, plus de 8 beste nummers 3. Dit zorgt ervoor dat bijna elke wedstrijd in de groepsfase ertoe doet."
      },
      {
        heading: "Nieuwe knockoutronde van 32",
        content: "Een belangrijke verandering is de toevoeging van een ronde van 32 in de knockoutfase. Dit betekent dat 32 van de 48 teams doorgaan naar de knock-outfase – twee derde van alle deelnemers. De complete knockoutfase bestaat nu uit: ronde van 32, achtste finales, kwartfinales, halve finales en de finale."
      },
      {
        heading: "Meer wedstrijden, meer spanning",
        content: "Het totale aantal wedstrijden stijgt van 64 naar 104. Dat zijn 40 extra wedstrijden verspreid over ruim 5 weken. Voor fans betekent dit meer voetbal, meer verrassingen en meer kansen om je poule te winnen. Voor voorspellers wordt het een grotere uitdaging – en juist dat maakt het zo leuk."
      },
      {
        heading: "Impact op je WK-poule",
        content: "Met 104 wedstrijden heb je veel meer mogelijkheden om punten te scoren in je poule. De kans op een verrassing is groter, waardoor het verschil tussen ervaren voetbalfans en beginners kleiner wordt. Goaltje berekent automatisch je punten voor alle 104 wedstrijden, zodat je altijd weet waar je staat."
      }
    ]
  },
  "wk-2026-speelsteden-stadions": {
    title: "WK 2026 speelsteden: 16 stadions in 3 landen",
    metaTitle: "WK 2026 Speelsteden & Stadions – 16 locaties in VS, Mexico & Canada | Goaltje",
    metaDesc: "Ontdek de 16 WK 2026 stadions in de VS, Mexico en Canada. Van MetLife Stadium tot Estadio Azteca – alle speelsteden op een rij.",
    keywords: "wk 2026 speelsteden, wk 2026 stadions, world cup 2026 venues, wk 2026 locaties, metlife stadium wk",
    heroColor: "from-green-600 to-emerald-500",
    icon: MapPin,
    date: "2026-02-23",
    readTime: "7 min",
    sections: [
      {
        heading: "3 landen, 16 stadions",
        content: "Het WK 2026 wordt gespeeld in drie landen: de Verenigde Staten (11 stadions), Mexico (3 stadions) en Canada (2 stadions). Het is de eerste keer dat een WK door drie gastlanden wordt georganiseerd. De stadions variëren van gloednieuwe arena's tot legendarische voetbaltempels."
      },
      {
        heading: "Verenigde Staten: 11 speelsteden",
        content: "De VS levert het leeuwendeel van de locaties: MetLife Stadium (New York/New Jersey), SoFi Stadium (Los Angeles), AT&T Stadium (Dallas), NRG Stadium (Houston), Hard Rock Stadium (Miami), Mercedes-Benz Stadium (Atlanta), Lumen Field (Seattle), Lincoln Financial Field (Philadelphia), Gillette Stadium (Boston), Levi's Stadium (San Francisco) en Arrowhead Stadium (Kansas City). De finale wordt gespeeld in het MetLife Stadium."
      },
      {
        heading: "Mexico: 3 iconische stadions",
        content: "Mexico is gastheer met drie stadions: het legendarische Estadio Azteca in Mexico-Stad (waar de openingswedstrijd wordt gespeeld), het Estadio Akron in Guadalajara en het Estadio BBVA in Monterrey. Het Estadio Azteca is het enige stadion ter wereld dat twee WK-finales heeft gehost (1970 en 1986)."
      },
      {
        heading: "Canada: 2 locaties",
        content: "Canada draagt bij met twee stadions: het BMO Field in Toronto en het BC Place in Vancouver. Voor Canada is het een historisch moment – het land doet niet alleen mee als gastland maar kwalificeert zich ook automatisch als deelnemer aan het toernooi."
      },
      {
        heading: "Tijdzones en wedstrijdplanning",
        content: "Met speelsteden verspreid over 4 tijdzones (Eastern, Central, Mountain en Pacific Time) en 3 landen is de wedstrijdplanning een logistieke uitdaging. Goaltje past automatisch alle wedstrijdtijden aan naar jouw lokale tijdzone, zodat je nooit een wedstrijd mist. Stel je voorspelling in vóór de aftrap en verdien punten!"
      }
    ]
  },
  "wk-2026-voorspellingen-favorieten": {
    title: "WK 2026 voorspellingen: favorieten en dark horses",
    metaTitle: "WK 2026 Voorspellingen – Favorieten, dark horses & kanshebbers | Goaltje",
    metaDesc: "Wie wordt wereldkampioen in 2026? Analyse van de favorieten zoals Brazilië, Argentinië en Frankrijk. Plus de dark horses om in de gaten te houden.",
    keywords: "wk 2026 voorspellingen, wk 2026 favoriet, wie wint wk 2026, world cup 2026 predictions, wk 2026 dark horse",
    heroColor: "from-orange-600 to-red-500",
    icon: Target,
    date: "2026-02-20",
    readTime: "6 min",
    sections: [
      {
        heading: "De topfavorieten",
        content: "Argentinië verdedigt als titelverdediger zijn kroon na de gewonnen finale in Qatar 2022. Met Lionel Messi (mogelijk zijn laatste WK) en een sterke generatie is La Albiceleste opnieuw de favoriet. Brazilië, met altijd een overvloed aan talent, wil zijn zesde wereldtitel veroveren. Frankrijk, finalist in 2022, beschikt met Mbappé over de beste speler ter wereld."
      },
      {
        heading: "Europese uitdagers",
        content: "Engeland droomt al decennia van een tweede wereldtitel en heeft een gouden generatie met spelers als Bellingham, Saka en Foden. Spanje, met zijn tikitaka-erfenis en jonge talenten, is altijd gevaarlijk. Duitsland speelt deels op eigen continent (dicht bij huis) en wil na het teleurstellende WK 2022 revanche. Portugal hoopt met of zonder Ronaldo op een eerste wereldtitel."
      },
      {
        heading: "Dark horses",
        content: "Japan heeft de afgelopen WK's indruk gemaakt met zeges op Duitsland en Spanje. De VS heeft als gastland een enorm thuisvoordeel en investeert zwaar in de MLS. Colombia, met een sterke kwalificatiecampagne, is de verrassing uit Zuid-Amerika. Marokko, halvefinalist in 2022, bewees dat Afrikaanse teams op het hoogste niveau kunnen concurreren."
      },
      {
        heading: "Het thuisvoordeel",
        content: "De VS, Mexico en Canada kwalificeren zich automatisch als gastlanden. Historisch gezien presteren gastlanden bovengemiddeld op WK's. Zuid-Korea haalde in 2002 de halve finale als gastland, en Rusland bereikte in 2018 de kwartfinale. Met het fanatieke Amerikaanse sportpubliek kan Team USA voor een verrassing zorgen."
      },
      {
        heading: "Doe je eigen voorspelling",
        content: "Denk jij te weten wie wereldkampioen wordt? Met Goaltje kun je al je voorspellingen vastleggen en punten verdienen. Voorspel de scores van alle 104 wedstrijden, daag je vrienden uit en bewijs dat jij de beste voetbalanalist bent. Maak gratis een poule aan en begin met voorspellen!"
      }
    ]
  },
  "wk-poule-winnen-strategieen": {
    title: "Zo win je jouw WK-poule in 2026: 5 slimme strategieën",
    metaTitle: "WK Poule Winnen – 5 strategieën voor je WK 2026 poule | Goaltje",
    metaDesc: "Wil je je WK-poule winnen in 2026? Ontdek 5 bewezen strategieën om meer punten te scoren. Van doelsaldo-tips tot underdog-kansen.",
    keywords: "wk poule winnen, wk poule tips, wk 2026 poule strategie, voetbalpoule strategie, wk voorspellen tips",
    heroColor: "from-yellow-500 to-amber-500",
    icon: Lightbulb,
    date: "2026-02-18",
    readTime: "5 min",
    sections: [
      {
        heading: "Strategie 1: Focus op doelverschil",
        content: "In de meeste poules krijg je extra punten voor het juist voorspellen van het doelverschil, zelfs als je de exacte score niet raadt. Bij Goaltje levert een juist doelsaldo 4 punten op, tegenover 3 voor alleen de juiste uitslag. Probeer daarom niet altijd de veilige 1-0 te voorspellen, maar denk na over hoeveel doelpunten er waarschijnlijk vallen."
      },
      {
        heading: "Strategie 2: Ga voor de exacte score bij topwedstrijden",
        content: "De jackpot is de exacte score: 6 punten bij Goaltje. Bij topwedstrijden tussen sterke teams zijn de uitslagen vaak voorspelbaarder (1-0, 2-1, 1-1). Focus je energie op deze wedstrijden en probeer de exacte score te raden. De kans is groter dan je denkt: bij het WK 2022 eindigde 18% van de wedstrijden in 1-0."
      },
      {
        heading: "Strategie 3: Volg blessure- en opstellingsnieuws",
        content: "Een team zonder zijn sterspeler presteert vaak anders. Volg het laatste nieuws over blessures, schorsingen en opstellingen. Als je weet dat een topspits geblesseerd is, kun je je voorspelling aanpassen. Goaltje biedt AI-gegenereerde wedstrijdinzichten die je helpen bij je voorspelling."
      },
      {
        heading: "Strategie 4: Onderschat underdogs niet",
        content: "Bij het WK 2022 won Saudi-Arabië van Argentinië en Japan van Duitsland en Spanje. Underdogs winnen vaker dan je denkt, vooral in de groepsfase. Als alle anderen in je poule dezelfde favoriet kiezen, kun je je onderscheiden door af en toe op de underdog te gokken."
      },
      {
        heading: "Strategie 5: Gebruik de Catch-up Calculator",
        content: "Goaltje heeft een unieke Catch-up Calculator die berekent hoeveel punten je nog nodig hebt om de leider in te halen. Gebruik deze tool om te bepalen of je veilig moet spelen of risico moet nemen met onverwachte voorspellingen. Soms moet je all-in gaan op verrassende uitslagen om de koppositie te pakken."
      }
    ]
  },
  "nederland-oranje-wk-2026": {
    title: "Oranje op het WK 2026: kansen, selectie en groepsindeling",
    metaTitle: "Nederland WK 2026 – Oranje kansen, selectie & groepsindeling | Goaltje",
    metaDesc: "Nederland gaat naar het WK 2026! Bekijk de verwachte selectie, groepsindeling en kansen van Oranje. Voorspel alle wedstrijden van het Nederlands elftal.",
    keywords: "nederland wk 2026, oranje wk 2026, nederlands elftal wk, wk 2026 nederland groep, oranje selectie wk 2026",
    heroColor: "from-orange-500 to-orange-600",
    icon: Flag,
    date: "2026-02-15",
    readTime: "6 min",
    sections: [
      {
        heading: "Nederland op het WK 2026",
        content: "Het Nederlands elftal heeft zich gekwalificeerd voor het WK 2026 in de VS, Mexico en Canada. Na een sterke kwalificatiecampagne reist Oranje af naar Noord-Amerika met de ambitie om voor het eerst sinds 2010 weer een WK-finale te bereiken. De verwachtingen zijn hoog, maar realistisch."
      },
      {
        heading: "Verwachte selectie",
        content: "Bondscoach Ronald Koeman beschikt over een mix van ervaring en jong talent. Virgil van Dijk leidt de verdediging, Frenkie de Jong is het creatieve middelpunt en Cody Gakpo bewijst zich als een van de gevaarlijkste aanvallers van Europa. Daarnaast zijn er opkomende talenten als Xavi Simons, Ryan Gravenberch en Jurriën Timber die het verschil kunnen maken."
      },
      {
        heading: "Sterke en zwakke punten",
        content: "De kracht van Oranje zit in het tactische systeem van Koeman, de individuele kwaliteit op het middenveld en een sterke centrale verdediging. Zwakke punten zijn de afhankelijkheid van een beperkt aantal topspelers en het gebrek aan een echte topspits in de traditie van Van Persie of Bergkamp. Het collectief moet het verschil maken."
      },
      {
        heading: "Hoe ver kan Oranje komen?",
        content: "Nederland is traditioneel een sterke WK-deelnemer: drie finales (1974, 1978, 2010), meerdere halve finales en altijd vermakelijk voetbal. Met het uitgebreide format van 48 landen en een mogelijke gunstige loting is de kwartfinale het minimale doel. Een goede groepsfase is cruciaal voor een gunstig pad in de knockoutfase."
      },
      {
        heading: "Voorspel Oranje-wedstrijden op Goaltje",
        content: "Volg alle wedstrijden van het Nederlands elftal op Goaltje. Voorspel de scores van elke Oranje-wedstrijd, verdien punten en daag je vrienden uit in je eigen poule. Met real-time score-updates en live ranglijsten mis je niets van het WK-avontuur van Oranje. Start gratis je eigen poule!"
      }
    ]
  }
};

const slugs = Object.keys(articles);

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articles[slug] : undefined;

  useEffect(() => {
    if (article) {
      document.title = article.metaTitle;
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", article.metaDesc);
      const keywords = document.querySelector('meta[name="keywords"]');
      if (keywords) {
        keywords.setAttribute("content", article.keywords);
      } else {
        const meta = document.createElement("meta");
        meta.name = "keywords";
        meta.content = article.keywords;
        document.head.appendChild(meta);
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", article.metaTitle);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", article.metaDesc);
      window.scrollTo(0, 0);
    }
  }, [article]);

  if (!article) return <Navigate to="/landing" replace />;

  const Icon = article.icon;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: article.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.metaDesc,
            datePublished: article.date,
            dateModified: article.date,
            author: { "@type": "Person", name: "Robert Cavalcante Rocha" },
            publisher: {
              "@type": "Organization",
              name: "Goaltje",
              logo: { "@type": "ImageObject", url: "https://goaltje.nl/favicon.png" }
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": window.location.href },
            keywords: article.keywords,
          }),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-primary-foreground/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-8 h-8" />
            <span className="font-display font-bold text-primary-foreground">GOALTJE</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 rounded-full hover:bg-primary-foreground/10 text-primary-foreground transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
            <Link to="/login">
              <Button size="sm" className="bg-secondary text-secondary-foreground font-semibold h-8 text-xs">
                Gratis meedoen
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`bg-gradient-to-br ${article.heroColor} py-16 md:py-24`}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Icon className="h-14 w-14 text-white/80 mx-auto mb-4" />
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-tight mb-4">
              {article.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-white/60 text-sm">
              <span>📅 {new Date(article.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</span>
              <span>⏱️ {article.readTime} leestijd</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <div className="space-y-10">
          {article.sections.map((section, i) => (
            <motion.section
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <h2 className="text-xl md:text-2xl font-display font-bold mb-3">{section.heading}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{section.content}</p>
            </motion.section>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border text-center"
        >
          <Trophy className="h-10 w-10 text-secondary mx-auto mb-3" />
          <h3 className="text-xl font-display font-bold mb-2">Start je eigen WK-poule</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
            Maak gratis een account aan, nodig je vrienden uit en voorspel alle 104 WK-wedstrijden. Wie wordt de beste voorspeller?
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-secondary text-secondary-foreground font-semibold h-12 px-8">
              🏆 Gratis meedoen
            </Button>
          </Link>
        </motion.div>

        {/* Related Articles */}
        <div className="mt-16">
          <h3 className="text-lg font-display font-bold mb-4">Meer WK 2026 artikelen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slugs.filter(s => s !== slug).slice(0, 4).map(s => {
              const a = articles[s];
              const AIcon = a.icon;
              return (
                <Link
                  key={s}
                  to={`/blog/${s}`}
                  className="flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors group"
                >
                  <div className={`bg-gradient-to-br ${a.heroColor} p-2 rounded-lg shrink-0`}>
                    <AIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">{a.title}</p>
                    <p className="text-muted-foreground text-xs mt-1">{a.readTime} leestijd</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </article>

      {/* Back */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <Link to="/landing" className="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Terug naar Goaltje
        </Link>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={goaltjeLogo} alt="Goaltje" className="w-5 h-5" />
            <span className="text-xs text-muted-foreground">© 2026 RobertDev.nl – GOALTJE</span>
          </div>
          <Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </footer>
    </div>
  );
}

export { slugs as blogSlugs };
