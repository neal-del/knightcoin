import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { adminLogin, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // If already admin, redirect
  if (isAdmin) {
    setLocation("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await adminLogin(email, password, rememberMe);
      toast({ title: "Welcome, Admin" });
      setLocation("/admin");
    } catch (err: any) {
      toast({ title: "Login failed", description: "Invalid admin credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Admin Login</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your admin email to manage KnightCoin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
            <Input
              type="email"
              placeholder="your.email@menloschool.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card"
              data-testid="input-admin-email"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
            <Input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-card"
              data-testid="input-admin-password"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border bg-card text-primary focus:ring-primary/50 w-3.5 h-3.5"
              data-testid="checkbox-admin-remember-me"
            />
            <span className="text-xs text-muted-foreground">Stay logged in</span>
          </label>
          <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-admin-login">
            {loading ? "Signing in..." : "Admin Sign In"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-6 p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Sign in with your Menlo School admin email
          </p>
        </div>
      </div>
    </div>
  );
}
