import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PoolSelectorProps {
  value: string;
  onChange: (poolId: string) => void;
  className?: string;
}

export function PoolSelector({ value, onChange, className }: PoolSelectorProps) {
  const { user } = useAuth();

  const { data: pools } = useQuery({
    queryKey: ["my-pools", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pool_members")
        .select("pool_id, pools(id, name)")
        .eq("user_id", user.id);
      return data?.map((m: any) => m.pools).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  if (!pools || pools.length === 0) return null;

  // Auto-select first pool if no value
  if (!value && pools.length > 0) {
    // Use setTimeout to avoid setState during render
    setTimeout(() => onChange(pools[0].id), 0);
  }

  if (pools.length === 1) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Trophy className="h-4 w-4 text-secondary" />
        <span className="font-medium">{pools[0].name}</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        "h-9 gap-2 border-primary/20 bg-primary/5 text-sm font-medium",
        className
      )}>
        <Trophy className="h-4 w-4 text-secondary shrink-0" />
        <SelectValue placeholder="Kies poule" />
      </SelectTrigger>
      <SelectContent>
        {pools.map((pool: any) => (
          <SelectItem key={pool.id} value={pool.id}>{pool.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
