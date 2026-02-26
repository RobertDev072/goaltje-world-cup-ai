import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Share2, MessageCircle, Instagram, Facebook } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ShareCardProps {
  type: "rank" | "points" | "prediction";
  poolName: string;
  playerName: string;
  rank?: number;
  totalPlayers?: number;
  points?: number;
  todayPoints?: number;
  prediction?: { home: string; away: string; homePred: number; awayPred: number; homeScore?: number; awayScore?: number; pointsAwarded?: number };
}

export function ShareCard({ type, poolName, playerName, rank, totalPlayers, points, todayPoints, prediction }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const w = 600;
    const h = 400;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0A1628");
    grad.addColorStop(0.5, "#0F2340");
    grad.addColorStop(1, "#0A1628");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative circles
    ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
    ctx.beginPath();
    ctx.arc(w - 80, 80, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(245, 158, 11, 0.06)";
    ctx.beginPath();
    ctx.arc(80, h - 60, 100, 0, Math.PI * 2);
    ctx.fill();

    // Top accent line
    const accentGrad = ctx.createLinearGradient(0, 0, w, 0);
    accentGrad.addColorStop(0, "#10B981");
    accentGrad.addColorStop(1, "#F59E0B");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, w, 4);

    // Goaltje branding
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("GOALTJE · WK 2026", 30, 40);

    // Pool name
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "13px system-ui, -apple-system, sans-serif";
    ctx.fillText(poolName, 30, 62);

    if (type === "rank" && rank != null) {
      // Rank card
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 120px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`#${rank}`, w / 2, 200);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.fillText(playerName, w / 2, 250);

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "16px system-ui, -apple-system, sans-serif";
      ctx.fillText(`van ${totalPlayers || "?"} spelers`, w / 2, 280);

      if (points != null) {
        ctx.fillStyle = "#10B981";
        ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
        ctx.fillText(`${points} punten`, w / 2, 330);
      }
    } else if (type === "points" && todayPoints != null) {
      // Today's points card
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 80px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`+${todayPoints}`, w / 2, 190);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      ctx.fillText("punten vandaag", w / 2, 230);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      ctx.fillText(playerName, w / 2, 280);

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Totaal: ${points || 0} punten`, w / 2, 310);
    } else if (type === "prediction" && prediction) {
      // Prediction card
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.fillText("Mijn voorspelling", w / 2, 110);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${prediction.home} vs ${prediction.away}`, w / 2, 150);

      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 64px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${prediction.homePred} - ${prediction.awayPred}`, w / 2, 230);

      if (prediction.homeScore != null && prediction.awayScore != null) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "16px system-ui, -apple-system, sans-serif";
        ctx.fillText(`Uitslag: ${prediction.homeScore} - ${prediction.awayScore}`, w / 2, 280);

        if (prediction.pointsAwarded != null && prediction.pointsAwarded > 0) {
          ctx.fillStyle = "#10B981";
          ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
          ctx.fillText(`+${prediction.pointsAwarded} punten!`, w / 2, 330);
        }
      }
    }

    // Footer
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.fillText("goaltje-world-cup-ai.lovable.app", w / 2, h - 20);

    return canvas;
  }, [type, poolName, playerName, rank, totalPlayers, points, todayPoints, prediction]);

  const downloadCard = () => {
    const canvas = generateCard();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `goaltje-${type}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "Kaart gedownload! 📸" });
  };

  const shareCard = async () => {
    const canvas = generateCard();
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `goaltje-${type}.png`, { type: "image/png" });
        const shareData = { files: [file], title: "Goaltje WK 2026", text: getShareText() };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }
      // Fallback: download
      downloadCard();
    } catch {
      downloadCard();
    }
  };

  const getShareText = () => {
    if (type === "rank") return `Ik sta #${rank} in ${poolName} op Goaltje! 🏆⚽`;
    if (type === "points") return `Ik haalde ${todayPoints} punten vandaag in ${poolName}! 🔥⚽`;
    if (type === "prediction" && prediction) return `Mijn voorspelling: ${prediction.home} ${prediction.homePred}-${prediction.awayPred} ${prediction.away} 🎯`;
    return "Check mijn score op Goaltje! ⚽";
  };

  const shareWhatsApp = () => {
    const canvas = generateCard();
    if (!canvas) return;
    downloadCard();
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareText() + "\n\nhttps://goaltje-world-cup-ai.lovable.app")}`, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-xl overflow-hidden shadow-elevation-3"
      >
        <canvas
          ref={(el) => { canvasRef.current = el; if (el) generateCard(); }}
          className="w-full h-auto"
          style={{ aspectRatio: "3/2" }}
        />
      </motion.div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={downloadCard} variant="outline" className="h-10 gap-2 rounded-xl text-xs">
          <Download className="h-4 w-4" /> Opslaan
        </Button>
        <Button onClick={shareCard} className="h-10 gap-2 rounded-xl gradient-primary text-primary-foreground text-xs">
          <Share2 className="h-4 w-4" /> Delen
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={shareWhatsApp} size="sm" className="h-9 gap-1.5 rounded-xl bg-[hsl(142,70%,42%)] hover:bg-[hsl(142,70%,36%)] text-white text-xs">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </Button>
        <Button
          size="sm"
          className="h-9 gap-1.5 rounded-xl text-white text-xs"
          style={{ background: "linear-gradient(135deg, hsl(37,97%,54%), hsl(340,82%,52%), hsl(281,73%,52%))" }}
          onClick={() => { downloadCard(); toast({ title: "Afbeelding opgeslagen! 📸", description: "Deel hem via je Instagram Story" }); }}
        >
          <Instagram className="h-3.5 w-3.5" /> Insta
        </Button>
        <Button
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background text-xs"
          onClick={() => { downloadCard(); toast({ title: "Afbeelding opgeslagen! 📸", description: "Deel op X of TikTok" }); }}
        >
          <Share2 className="h-3.5 w-3.5" /> X/TikTok
        </Button>
      </div>
    </div>
  );
}
