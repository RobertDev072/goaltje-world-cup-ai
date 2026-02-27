import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, MessageCircle, Link2, Instagram, Facebook, Check, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import goaltjeLogo from "@/assets/goaltje-logo.png";
import { cn } from "@/lib/utils";

interface SocialShareSheetProps {
  poolName: string;
  inviteCode: string;
  poolLink: string;
  shareText: string;
  onClose?: () => void;
}

export function SocialShareSheet({ poolName, inviteCode, poolLink, shareText, onClose }: SocialShareSheetProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCodeCopied(true);
    toast({ title: "Code gekopieerd! 📋" });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(poolLink);
    setLinkCopied(true);
    toast({ title: "Link gekopieerd! 📋" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(poolLink)}&quote=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareInstagram = () => {
    navigator.clipboard.writeText(shareText);
    toast({ title: "Tekst gekopieerd voor Instagram! 📸", description: "Plak dit in je Instagram Story of bio" });
  };

  const shareTikTok = () => {
    navigator.clipboard.writeText(shareText);
    toast({ title: "Tekst gekopieerd voor TikTok! 🎵", description: "Plak dit in je TikTok bio of video beschrijving" });
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Goaltje - ${poolName}`, text: shareText, url: poolLink });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-5">
      {/* Pool name badge */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-display font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
          <Users className="h-3 w-3" />
          {poolName}
        </span>
      </div>

      {/* Hero: QR Code + Invite Code combined */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
      >
        <div className="relative bg-white p-5 rounded-3xl shadow-elevation-3 ring-1 ring-border/10">
          <QRCodeSVG
            value={poolLink}
            size={200}
            level="H"
            imageSettings={{
              src: goaltjeLogo,
              height: 44,
              width: 44,
              excavate: true,
            }}
          />
          {/* Invite code badge overlapping bottom of QR */}
          <motion.button
            onClick={copyCode}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "absolute -bottom-4 left-1/2 -translate-x-1/2",
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-elevation-3 border border-border/50",
              "transition-all duration-300",
              codeCopied
                ? "bg-success text-white"
                : "gradient-navy text-white hover:shadow-glow-primary"
            )}
          >
            {codeCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-3.5 w-3.5 opacity-60" />
            )}
            <code className="text-lg font-mono font-bold tracking-[0.3em]">
              {inviteCode}
            </code>
          </motion.button>
        </div>
      </motion.div>

      {/* Instruction text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-center text-xs text-muted-foreground mt-6"
      >
        Scan de QR-code of deel de uitnodigingscode
      </motion.p>

      {/* Social Buttons */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-4 gap-2"
      >
        <button
          onClick={shareWhatsApp}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[hsl(142,70%,42%)]/10 hover:bg-[hsl(142,70%,42%)]/20 transition-colors group"
        >
          <div className="h-11 w-11 rounded-xl bg-[hsl(142,70%,42%)] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">WhatsApp</span>
        </button>

        <button
          onClick={shareFacebook}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[hsl(221,44%,41%)]/10 hover:bg-[hsl(221,44%,41%)]/20 transition-colors group"
        >
          <div className="h-11 w-11 rounded-xl bg-[hsl(221,44%,41%)] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Facebook className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Facebook</span>
        </button>

        <button
          onClick={shareInstagram}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[hsl(340,82%,52%)]/10 hover:bg-[hsl(340,82%,52%)]/20 transition-colors group"
        >
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
            style={{ background: "linear-gradient(135deg, hsl(37,97%,54%), hsl(340,82%,52%), hsl(281,73%,52%))" }}
          >
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Instagram</span>
        </button>

        <button
          onClick={shareTikTok}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-foreground/5 hover:bg-foreground/10 transition-colors group"
        >
          <div className="h-11 w-11 rounded-xl bg-foreground flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <svg className="h-5 w-5 text-background" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.07a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.5z" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">TikTok</span>
        </button>
      </motion.div>

      {/* Bottom actions */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2"
      >
        <Button
          variant="outline"
          className={cn(
            "flex-1 h-11 gap-2 rounded-xl transition-all",
            linkCopied && "bg-success/10 border-success/30 text-success"
          )}
          onClick={copyLink}
        >
          {linkCopied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {linkCopied ? "Gekopieerd!" : "Kopieer link"}
        </Button>
        <Button
          className="flex-1 h-11 gap-2 rounded-xl gradient-primary text-primary-foreground"
          onClick={shareNative}
        >
          <Share2 className="h-4 w-4" /> Deel...
        </Button>
      </motion.div>
    </div>
  );
}
