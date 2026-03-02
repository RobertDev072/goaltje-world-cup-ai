import goaltjeLogo from "@/assets/goaltje-logo.png";

export function AppSplashLoader({ message = "Goaltje laden…" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--goaltje-navy))] via-[hsl(var(--goaltje-darkblue))] to-[hsl(var(--primary))] animate-splash-in">
      <div className="flex flex-col items-center gap-6">
        <img
          src={goaltjeLogo}
          alt="Goaltje"
          className="w-24 h-24 drop-shadow-2xl animate-splash-logo"
        />
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full bg-secondary"
              style={{
                animation: "splashDot 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <p className="text-white/60 text-sm font-medium tracking-wide">{message}</p>
      </div>
      <p className="absolute bottom-8 text-white/20 text-[10px]">© 2026 RobertDev.nl</p>
    </div>
  );
}
