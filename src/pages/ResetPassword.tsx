import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      navigate("/auth");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Wachtwoord te kort", description: "Minimaal 6 tekens.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Wachtwoord gewijzigd!" });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[hsl(var(--goaltje-navy))] via-[hsl(var(--goaltje-darkblue))] to-[hsl(var(--primary))]">
      <Card className="w-full max-w-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="font-display text-center">Nieuw wachtwoord</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nieuw wachtwoord</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimaal 6 tekens"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground" disabled={loading}>
              {loading ? "Opslaan..." : "Wachtwoord opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
