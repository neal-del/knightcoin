import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Coins, ArrowRight, Shield } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const [isRegister, setIsRegister] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || (isRegister && !displayName)) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password, displayName, rememberMe);
        toast({ title: "Welcome to KnightCoin", description: "You've earned 1,000 KC to start trading." });
      } else {
        await login(username, password, rememberMe);
        toast({ title: "Welcome back" });
      }
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Coins className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            {isRegister ? "Join KnightCoin" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRegister
              ? "Create your account and get 1,000 KC to start"
              : "Sign in to your prediction market account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Display Name</label>
              <Input
                placeholder="e.g. KnightRider99"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-card"
                data-testid="input-display-name"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Username</label>
            <Input
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-card"
              data-testid="input-username"
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
              data-testid="input-password"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border bg-card text-primary focus:ring-primary/50 w-3.5 h-3.5"
              data-testid="checkbox-remember-me"
            />
            <span className="text-xs text-muted-foreground">Stay logged in</span>
          </label>
          <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-submit-auth">
            {loading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary hover:underline font-medium"
            data-testid="button-toggle-auth"
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </p>

        {/* Quick login hint */}
        <div className="mt-6 p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Demo: username <strong className="text-foreground">knight</strong> / password <strong className="text-foreground">menlo2026</strong>
          </p>
        </div>

        {/* Admin login link */}
        <div className="mt-3 text-center">
          <Link href="/admin/login">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-admin-login">
              <Shield className="w-3 h-3" />
              Admin Login
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
