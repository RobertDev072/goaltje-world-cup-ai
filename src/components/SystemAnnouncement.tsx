import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

export function SystemAnnouncement() {
  const [text, setText] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success">("info");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    supabase
      .from("system_settings")
      .select("value")
      .eq("key", "announcement")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value?.active && data.value.text) {
          setText(data.value.text);
          setType(data.value.type || "info");
          setDismissed(false);
        }
      });
  }, []);

  if (!text || dismissed) return null;

  const styles = {
    info:    "bg-blue-500/15 border-blue-500/30 text-blue-200",
    warning: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    success: "bg-green-500/15 border-green-500/30 text-green-200",
  };
  const Icon = type === "warning" ? AlertTriangle : type === "success" ? CheckCircle2 : Info;

  return (
    <div className={`flex items-start gap-2 px-4 py-2.5 border-b text-sm ${styles[type]}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="flex-1">{text}</p>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
