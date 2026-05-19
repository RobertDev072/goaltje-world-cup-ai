import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { trackSignUp } from "@/lib/analytics";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionTracked = useRef<Set<string>>(new Set());

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Forward auth token to the Realtime client so presence + private channels work.
      // Without this, channel.subscribe() can hang in "opening" indefinitely.
      if (session?.access_token) {
        try {
          (supabase.realtime as unknown as { setAuth: (t: string) => void }).setAuth(session.access_token);
        } catch { /* older client versions don't have setAuth — safe to ignore */ }
      }

      if (event === "SIGNED_IN" && session?.user) {
        const sessionKey = session.access_token?.substring(0, 16);
        if (sessionKey && !sessionTracked.current.has(sessionKey)) {
          sessionTracked.current.add(sessionKey);
          setTimeout(() => {
            supabase.functions.invoke("log-event", {
              body: {
                event_type: "login",
                metadata: { provider: session.user.app_metadata?.provider || "email" },
                session_id: sessionKey,
              },
            }).catch(() => {
              // fallback: direct session insert without IP
              supabase.from("user_sessions").insert({
                user_id: session.user.id,
                device_info: navigator.userAgent?.substring(0, 200) || null,
              }).then(() => {});
            });
          }, 0);
        }
      }

      if (event === "SIGNED_OUT") {
        supabase.functions.invoke("log-event", {
          body: { event_type: "logout" },
        }).catch(() => {});
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) {
        try {
          (supabase.realtime as unknown as { setAuth: (t: string) => void }).setAuth(session.access_token);
        } catch { /* noop */ }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://goaltje.nl",
        data: { name: name || email.split("@")[0] },
      },
    });
    if (!error) trackSignUp();
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://goaltje.nl/reset-password",
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
