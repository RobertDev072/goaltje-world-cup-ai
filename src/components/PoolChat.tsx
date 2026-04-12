import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, SmilePlus, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["⚽", "🎉", "😂", "🔥", "👏", "😱", "💪", "😤"];
const RATE_LIMIT_MS = 3000;
const MESSAGE_LIMIT = 10;

type MessageStatus = "sending" | "sent" | "failed";

interface OptimisticMessage {
  id: string;
  pool_id: string;
  user_id: string;
  message: string;
  created_at: string;
  status: MessageStatus;
}

interface PoolChatProps {
  poolId: string;
}

export function PoolChat({ poolId }: PoolChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserScrolled = useRef(false);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  // Fetch last 10 non-expired messages
  const { data: serverMessages, isLoading } = useQuery({
    queryKey: ["pool-messages", poolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pool_messages")
        .select("*")
        .eq("pool_id", poolId)
        .gt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(MESSAGE_LIMIT);
      if (error) throw error;
      return (data || []).reverse();
    },
    enabled: !!poolId,
    refetchInterval: 30_000,
  });

  // Fetch profiles for message authors
  const allMessages = useMemo(() => {
    const server = serverMessages || [];
    const optimistic = optimisticMessages.filter(
      (om) => !server.some((sm: any) => sm.message === om.message && sm.user_id === om.user_id)
    );
    return [...server.map((m: any) => ({ ...m, status: "sent" as MessageStatus })), ...optimistic];
  }, [serverMessages, optimisticMessages]);

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    allMessages.forEach((m) => ids.add(m.user_id));
    return Array.from(ids);
  }, [allMessages]);

  const { data: profiles } = useQuery({
    queryKey: ["chat-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const map: Record<string, { name: string; avatar_url: string | null }> = {};
      data?.forEach((p: any) => { map[p.user_id] = p; });
      return map;
    },
    enabled: userIds.length > 0,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`pool-chat-${poolId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "pool_messages",
        filter: `pool_id=eq.${poolId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["pool-messages", poolId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [poolId, queryClient]);

  // Auto-scroll (unless user scrolled up)
  const scrollToBottom = useCallback(() => {
    if (!isUserScrolled.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, scrollToBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isUserScrolled.current = scrollHeight - scrollTop - clientHeight > 50;
  };

  const sendMsg = async (content: string) => {
    if (!user || !content.trim()) return;

    // Rate limiting
    const now = Date.now();
    const elapsed = now - lastSentAt;
    if (elapsed < RATE_LIMIT_MS) {
      setRateLimitCountdown(Math.ceil((RATE_LIMIT_MS - elapsed) / 1000));
      return;
    }

    const tempId = `temp-${now}`;
    const optimistic: OptimisticMessage = {
      id: tempId,
      pool_id: poolId,
      user_id: user.id,
      message: content.trim(),
      created_at: new Date().toISOString(),
      status: "sending",
    };

    setOptimisticMessages((prev) => [...prev, optimistic]);
    setLastSentAt(now);
    setRateLimitCountdown(Math.ceil(RATE_LIMIT_MS / 1000));
    setMessage("");
    inputRef.current?.focus();

    try {
      const { error } = await supabase.from("pool_messages").insert({
        pool_id: poolId,
        user_id: user.id,
        message: content.trim(),
      });
      if (error) throw error;
      // Mark as sent, will be replaced by server data on next fetch
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sent" } : m))
      );
    } catch {
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
    }
  };

  const retryMessage = (msg: OptimisticMessage) => {
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== msg.id));
    sendMsg(msg.message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) sendMsg(message);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("nl-NL", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam",
    });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <CardContent className="p-0 flex flex-col" style={{ height: "350px" }}>
        {/* Messages area */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {allMessages.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <div className="text-center">
                <p className="text-2xl mb-2">💬</p>
                <p>Nog geen berichten</p>
                <p className="text-[10px] mt-1">Berichten verdwijnen na 5 minuten</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {allMessages.map((msg: any) => {
              const isMe = msg.user_id === user?.id;
              const profile = profiles?.[msg.user_id];
              const isSending = msg.status === "sending";
              const isFailed = msg.status === "failed";

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-2", isMe ? "flex-row-reverse" : "")}
                >
                  {!isMe && (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold overflow-hidden shrink-0 mt-1">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        : (profile?.name || "?")[0].toUpperCase()}
                    </div>
                  )}

                  <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start")}>
                    {!isMe && (
                      <p className="text-[10px] text-muted-foreground mb-0.5 px-1">
                        {profile?.name || "Onbekend"} · {formatTime(msg.created_at)}
                      </p>
                    )}

                    <div className={cn(
                      "px-3 py-1.5 rounded-2xl text-sm leading-relaxed",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-md"
                        : "bg-muted rounded-tl-md",
                      isSending && "opacity-60",
                      isFailed && "bg-destructive/10 border border-destructive/30",
                    )}>
                      {msg.message}
                    </div>

                    {/* Message status */}
                    {isMe && (
                      <div className="flex items-center gap-1 mt-0.5 px-1 justify-end">
                        {isSending && <span className="text-[9px] text-muted-foreground">Versturen...</span>}
                        {isFailed && (
                          <button
                            onClick={() => retryMessage(msg)}
                            className="text-[9px] text-destructive flex items-center gap-0.5"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Mislukt - opnieuw
                            <RefreshCw className="h-2.5 w-2.5" />
                          </button>
                        )}
                        {!isSending && !isFailed && (
                          <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Input area */}
        <div className="border-t border-muted p-2">
          <AnimatePresence>
            {showEmojis && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-1 pb-2 flex-wrap">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { setMessage(prev => prev + emoji); setShowEmojis(false); inputRef.current?.focus(); }}
                      className="text-lg hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEmojis(!showEmojis)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
            >
              <SmilePlus className="h-5 w-5" />
            </button>
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={rateLimitCountdown > 0 ? `Wacht ${rateLimitCountdown}s...` : "Typ een bericht..."}
              className="h-9 rounded-full text-sm"
              maxLength={500}
              disabled={rateLimitCountdown > 0}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 w-9 rounded-full gradient-primary p-0 shrink-0"
              disabled={!message.trim() || rateLimitCountdown > 0}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
