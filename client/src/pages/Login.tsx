import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Coins, ArrowRight, Shield, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [step, setStep] = useState<"email" | "verify" | "details">("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, register, sendVerification } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for referral code in URL
  const [referralCode, setReferralCode] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email", variant: "destructive" });
      return;
    }
    if (!email.toLowerCase().endsWith("@menloschool.org")) {
      toast({ title: "Must be a @menloschool.org email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await sendVerification(email);
      toast({ title: "Code sent", description: "Check your email for the verification code." });
      setStep("verify");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setStep("details");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !displayName) {
      toast({ title: "Name and password are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register(email, verificationCode, username, password, displayName, rememberMe, referralCode || undefined);
      toast({ title: "Welcome to The Knight Market", description: `You've earned ${referralCode ? "1,200" : "1,000"} KC to start trading.` });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login(username, password, rememberMe);
      toast({ title: "Welcome back" });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step indicators for registration
  const stepNum = step === "email" ? 1 : step === "verify" ? 2 : 3;

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Coins className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            {mode === "register" ? "Join The Knight Market" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "register"
              ? "Create your account with your Menlo email"
              : "Sign in to your prediction market account"}
          </p>
          {referralCode && mode === "register" && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              Referral applied — you'll get an extra 200 KC
            </div>
          )}
        </div>

        {mode === "register" ? (
          <>
            {/* Step progress */}
            <div className="flex items-center gap-2 mb-6 px-2">
              {[
                { num: 1, label: "Email", icon: Mail },
                { num: 2, label: "Verify", icon: KeyRound },
                { num: 3, label: "Account", icon: CheckCircle2 },
              ].map(({ num, label, icon: Icon }) => (
                <div key={num} className="flex-1">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    stepNum === num ? "bg-primary/10 text-primary font-medium" :
                    stepNum > num ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Step 1: Email */}
            {step === "email" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Menlo School Email</label>
                  <Input
                    type="email"
                    placeholder="you@menloschool.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-card"
                    data-testid="input-email"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Only @menloschool.org emails are accepted
                  </p>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-send-code">
                  {loading ? "Sending..." : "Send Verification Code"}
                  <Mail className="w-4 h-4" />
                </Button>
              </form>
            )}

            {/* Step 2: Verify code */}
            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 mb-2">
                  <p className="text-xs text-foreground/80">
                    We sent a 6-digit code to <strong className="text-primary">{email}</strong>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Verification Code</label>
                  <Input
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="bg-card text-center text-lg tracking-[0.3em] font-mono"
                    maxLength={6}
                    data-testid="input-verification-code"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={verificationCode.length !== 6} data-testid="button-verify-code">
                  Verify Code
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
                >
                  Use a different email
                </button>
              </form>
            )}

            {/* Step 3: Account details */}
            {step === "details" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-foreground/80">
                    Email verified: <strong className="text-primary">{email}</strong>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                  <Input
                    placeholder="e.g. John Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-card"
                    data-testid="input-display-name"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Your real name — visible to admins</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Username <span className="text-muted-foreground/60">(optional)</span></label>
                  <Input
                    placeholder="e.g. john.smith"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-card"
                    data-testid="input-username"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Optional — recommended if you want to remain pseudonymous. If blank, one will be generated from your name.</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
                  <Input
                    type="password"
                    placeholder="at least 6 characters"
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
                <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-submit-register">
                  {loading ? "Creating..." : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            )}
          </>
        ) : (
          /* Login form */
          <form onSubmit={handleLogin} className="space-y-4">
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
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === "register" ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "register" ? "login" : "register"); setStep("email"); }}
            className="text-primary hover:underline font-medium"
            data-testid="button-toggle-auth"
          >
            {mode === "register" ? "Sign in" : "Create one"}
          </button>
        </p>

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
