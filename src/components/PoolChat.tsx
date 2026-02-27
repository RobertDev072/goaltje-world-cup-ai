import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, SmilePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["⚽", "🎉", "😂", "🔥", "👏", "😱", "💪", "😤"];

interface PoolChatProps {
  poolId: string;
}

export function PoolChat({ poolId }: PoolChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["pool-messages", poolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pool_messages")
        .select("*")
        .eq("pool_id", poolId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!poolId,
  });

  // Fetch profiles for message authors
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    messages?.forEach((m: any) => ids.add(m.user_id));
    return Array.from(ids);
  }, [messages]);

  const { data: profiles } = useQuery({
    queryKey: ["chat-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pool_messages", filter: `pool_id=eq.${poolId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pool-messages", poolId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [poolId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user || !message.trim()) return;
      const { error } = await supabase.from("pool_messages").insert({
        pool_id: poolId,
        user_id: user.id,
        message: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      inputRef.current?.focus();
    },
  });

  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await supabase.rpc("toggle_message_reaction", {
        _message_id: messageId,
        _emoji: emoji,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pool-messages", poolId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) sendMessage.mutate();
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("nl-NL", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam"
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Vandaag";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Gisteren";
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    const groups: { date: string; messages: any[] }[] = [];
    let currentDate = "";
    messages.forEach((msg: any) => {
      const date = formatDate(msg.created_at);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [messages]);

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card className="border-0 shadow-elevation-2 overflow-hidden">
      <CardContent className="p-0 flex flex-col" style={{ height: "400px" }}>
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {groupedMessages.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <div className="text-center">
                <p className="text-2xl mb-2">💬</p>
                <p>Nog geen berichten. Zeg iets!</p>
              </div>
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-muted" />
                <span className="text-[10px] text-muted-foreground font-medium px-2">{group.date}</span>
                <div className="flex-1 h-px bg-muted" />
              </div>

              {group.messages.map((msg: any, i: number) => {
                const isMe = msg.user_id === user?.id;
                const profile = profiles?.[msg.user_id];
                const reactions = msg.reactions_json || {};
                const prevMsg = i > 0 ? group.messages[i - 1] : null;
                const sameUser = prevMsg?.user_id === msg.user_id;

                return (
                    <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("group flex gap-2", isMe ? "flex-row-reverse" : "")}
                  >
                    {/* Avatar */}
                    {!sameUser && !isMe && (
                      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 mt-1">
                        {profile?.avatar_url
                          ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                          : (profile?.name || "?")[0].toUpperCase()}
                      </div>
                    )}
                    {sameUser && !isMe && <div className="w-7 shrink-0" />}

                    <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start")}>
                      {/* Name + time */}
                      {!sameUser && (
                        <p className={cn("text-[10px] text-muted-foreground mb-0.5 px-1", isMe && "text-right")}>
                          {isMe ? "Jij" : profile?.name || "Onbekend"} · {formatTime(msg.created_at)}
                        </p>
                      )}

                      {/* Message bubble */}
                      <div className={cn(
                        "px-3 py-1.5 rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : "bg-muted rounded-tl-md"
                      )}>
                        {msg.message}
                      </div>

                      {/* Reactions */}
                      {Object.keys(reactions).length > 0 && (
                        <div className="flex gap-1 mt-0.5 px-1 flex-wrap">
                          {Object.entries(reactions).map(([emoji, users]: [string, any]) => {
                            const count = Array.isArray(users) ? users.length : 0;
                            if (count === 0) return null;
                            const iReacted = Array.isArray(users) && users.includes(user?.id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction.mutate({ messageId: msg.id, emoji })}
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full border transition-colors",
                                  iReacted
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-muted/50 border-muted text-muted-foreground hover:bg-muted"
                                )}
                              >
                                {emoji} {count}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Quick reaction on hover/tap */}
                      {!isMe && (
                        <div className="flex gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {["⚽", "🔥", "👏"].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction.mutate({ messageId: msg.id, emoji })}
                              className="text-xs hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-muted p-2">
          {/* Emoji picker */}
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
              placeholder="Typ een bericht..."
              className="h-9 rounded-full text-sm"
              maxLength={500}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 w-9 rounded-full gradient-primary p-0 shrink-0"
              disabled={!message.trim() || sendMessage.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
