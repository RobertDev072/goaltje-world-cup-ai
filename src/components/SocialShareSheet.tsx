import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, MessageCircle, Link2, X, Instagram, Facebook } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import goaltjeLogo from "@/assets/goaltje-logo.png";

interface SocialShareSheetProps {
  poolName: string;
  inviteCode: string;
  poolLink: string;
  shareText: string;
  onClose?: () => void;
}

export function SocialShareSheet({ poolName, inviteCode, poolLink, shareText, onClose }: SocialShareSheetProps) {
  const copyLink = () => {
    navigator.clipboard.writeText(poolLink);
    toast({ title: "Link gekopieerd! 📋" });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: "Code gekopieerd! 📋" });
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(poolLink)}&quote=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareInstagram = () => {
    // Instagram doesn't support direct URL sharing, copy text for stories
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
    <div className="space-y-4">
      {/* Invite Code */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 bg-muted/50 rounded-2xl px-5 py-3"
        >
          <code className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">{inviteCode}</code>
          <button onClick={copyCode} className="text-muted-foreground hover:text-primary transition-colors">
            <Copy className="h-4 w-4" />
          </button>
        </motion.div>
      </div>

      {/* QR Code with Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center"
      >
        <div className="relative bg-white p-3 rounded-2xl shadow-elevation-2">
          <QRCodeSVG
            value={poolLink}
            size={160}
            level="H"
            imageSettings={{
              src: goaltjeLogo,
              height: 36,
              width: 36,
              excavate: true,
            }}
          />
        </div>
      </motion.div>

      {/* Social Buttons Grid */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-2"
      >
        <Button
          onClick={shareWhatsApp}
          className="h-12 gap-2 rounded-xl bg-[hsl(142,70%,42%)] hover:bg-[hsl(142,70%,36%)] text-white font-semibold"
        >
          <MessageCircle className="h-5 w-5" />
          WhatsApp
        </Button>
        <Button
          onClick={shareFacebook}
          className="h-12 gap-2 rounded-xl bg-[hsl(221,44%,41%)] hover:bg-[hsl(221,44%,35%)] text-white font-semibold"
        >
          <Facebook className="h-5 w-5" />
          Facebook
        </Button>
        <Button
          onClick={shareInstagram}
          className="h-12 gap-2 rounded-xl text-white font-semibold"
          style={{
            background: "linear-gradient(135deg, hsl(37,97%,54%), hsl(340,82%,52%), hsl(281,73%,52%))",
          }}
        >
          <Instagram className="h-5 w-5" />
          Instagram
        </Button>
        <Button
          onClick={shareTikTok}
          className="h-12 gap-2 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.07a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.5z" />
          </svg>
          TikTok
        </Button>
      </motion.div>

      {/* Extra actions */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2"
      >
        <Button variant="outline" className="flex-1 h-11 gap-2 rounded-xl" onClick={copyLink}>
          <Link2 className="h-4 w-4" /> Kopieer link
        </Button>
        <Button variant="outline" className="flex-1 h-11 gap-2 rounded-xl" onClick={shareNative}>
          <Share2 className="h-4 w-4" /> Meer...
        </Button>
      </motion.div>
    </div>
  );
}
