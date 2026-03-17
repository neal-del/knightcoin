import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { formatKC } from "@/lib/format";
import MarketCard from "@/components/MarketCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Zap, ArrowRight, Coins, Gift, Clock, Share2, Copy, Check, Trophy, Medal, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import type { Market } from "@shared/schema";

interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  totalWinnings: number;
  totalBets: number;
  correctPredictions: number;
  portfolioValue: number;
  netWorth: number;
}

function useDailyCooldown(lastDailyBonus: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState("");
  const [canClaim, setCanClaim] = useState(true);

  useEffect(() => {
    if (!lastDailyBonus) {
      setCanClaim(true);
      setTimeLeft("");
      return;
    }

    const check = () => {
      const lastClaim = new Date(lastDailyBonus).getTime();
      const now = Date.now();
      const diff = (lastClaim + 24 * 60 * 60 * 1000) - now;
      if (diff <= 0) {
        setCanClaim(true);
        setTimeLeft("");
      } else {
        setCanClaim(false);
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m`);
      }
    };

    check();
    const interval = setInterval(check, 60000); // update every minute
    return () => clearInterval(interval);
  }, [lastDailyBonus]);

  return { canClaim, timeLeft };
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const { data: featured, isLoading: featuredLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets/featured"],
  });

  const { data: allMarkets, isLoading: allLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const featuredIds = new Set(featured?.map((m) => m.id) || []);

  const schoolMarkets = allMarkets?.filter((m) =>
    ["sports", "academic", "social", "campus", "admin"].includes(m.category) && !featuredIds.has(m.id) && !m.resolved
  ).slice(0, 4);

  const macroMarkets = allMarkets?.filter((m) =>
    ["politics", "pro-sports", "tech", "crypto"].includes(m.category) && !featuredIds.has(m.id) && !m.resolved
  ).slice(0, 4);

  const { data: leaderboard, isLoading: lbLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ["/api/leaderboard"],
  });

  // Find current user's rank (1-based). If user is not on the leaderboard, show "—"
  const userRank = useMemo(() => {
    if (!leaderboard || !user) return null;
    const idx = leaderboard.findIndex((u) => u.id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, user]);

  const { canClaim, timeLeft } = useDailyCooldown(user?.lastDailyBonus);
  const [claiming, setClaiming] = useState(false);

  const handleClaimBonus = async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    try {
      await apiRequest("POST", "/api/wallet/daily-bonus");
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      toast({ title: "+100 KC", description: "Daily bonus claimed! Come back tomorrow." });
    } catch (err: any) {
      // Try to extract message from response
      try {
        const body = await err?.json?.();
        if (body?.hoursRemaining) {
          toast({ title: "Already claimed today", description: `Next claim in ${Math.ceil(body.hoursRemaining)}h`, variant: "destructive" });
        }
      } catch {
        toast({ title: "Already claimed", description: "Come back tomorrow!", variant: "destructive" });
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto space-y-8">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-5 h-5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">The Knight Market</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2" data-testid="text-hero-title">
            Prediction Market
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mb-4">
            Trade on school events, sports, academics, and real-world outcomes using KnightCoin (KC). No real money, all the strategy.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {!user ? (
              <Link href="/login">
                <Button className="gap-2" data-testid="button-get-started">
                  <Zap className="w-4 h-4" />
                  Get Started with Your Menlo Email
                </Button>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-card/80 border border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Balance</div>
                    <div className="text-lg font-bold text-primary tabular-nums">{formatKC(user.balance)} KC</div>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Bets</div>
                    <div className="text-lg font-bold text-foreground tabular-nums">{user.totalBets}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClaimBonus}
                  className="gap-1.5"
                  disabled={!canClaim || claiming}
                  data-testid="button-daily-bonus"
                >
                  {canClaim ? (
                    <>
                      <Gift className="w-3.5 h-3.5" />
                      {claiming ? "Claiming..." : "Claim Daily 100 KC"}
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      Next claim in {timeLeft}
                    </>
                  )}
                </Button>
                <ReferralButton />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Widget */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-foreground">Leaderboard</h2>
          </div>
          <Link href="/leaderboard">
            <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
              Full leaderboard <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
        {lbLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div>
            {/* Top 5 */}
            {leaderboard.slice(0, 5).map((u, i) => {
              const rank = i + 1;
              const isCurrentUser = user?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-5 py-2.5 border-b border-border/50 last:border-b-0 transition-colors ${
                    isCurrentUser ? "bg-primary/5" : "hover:bg-muted/10"
                  }`}
                >
                  <span className="w-6 text-center shrink-0">
                    {rank === 1 ? (
                      <span className="text-base">👑</span>
                    ) : rank === 2 ? (
                      <span className="text-base">🥈</span>
                    ) : rank === 3 ? (
                      <span className="text-base">🥉</span>
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">#{rank}</span>
                    )}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {u.displayName.charAt(0)}
                  </div>
                  <span className={`text-sm font-medium truncate flex-1 ${
                    isCurrentUser ? "text-primary" : "text-foreground"
                  }`}>
                    {u.displayName}{isCurrentUser ? " (you)" : ""}
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                    {formatKC(u.netWorth)} KC
                  </span>
                </div>
              );
            })}

            {/* Current user's rank if not in top 5 */}
            {user && userRank && userRank > 5 && (
              <>
                <div className="px-5 py-1.5 text-center">
                  <span className="text-[10px] text-muted-foreground tracking-wider">···</span>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5 border-t border-border/50">
                  <span className="w-6 text-center shrink-0">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">#{userRank}</span>
                  </span>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {user.displayName?.charAt(0) || user.username?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm font-medium text-primary truncate flex-1">
                    {user.displayName || user.username} (you)
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                    {formatKC(leaderboard.find((u) => u.id === user.id)?.netWorth ?? user.balance)} KC
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No traders on the leaderboard yet. Start trading to claim the top spot.
          </div>
        )}
      </section>

      {/* Featured Markets */}
      {featuredLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      ) : featured && featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Featured Markets</h2>
            </div>
            <Link href="/markets">
              <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                View all <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((m) => <MarketCard key={m.id} market={m} />)}
          </div>
        </section>
      )}

      {/* School Markets */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🏫</span>
            <h2 className="text-base font-semibold text-foreground">School Markets</h2>
          </div>
          <Link href="/markets">
            <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
              View all <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
        {allLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schoolMarkets?.map((m) => <MarketCard key={m.id} market={m} />)}
          </div>
        )}
      </section>

      {/* Macro Markets */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Macro Markets</h2>
          </div>
          <Link href="/markets">
            <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
              View all <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
        {allLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {macroMarkets?.map((m) => <MarketCard key={m.id} market={m} />)}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-base font-semibold text-foreground mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Earn KC</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get 1,000 KC when you sign up with your Menlo email, plus 100 KC daily. Refer friends for bonus KC.
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Make Predictions</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Buy Yes or No shares on markets. Prices range from 1¢ to 99¢, reflecting the crowd's probability estimate.
            </p>
          </div>
          <div>
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Win & Climb</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Correct predictions pay out at 100¢ per share. Climb the leaderboard and earn bragging rights.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Referral link generator component
function ReferralButton() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/referral");
      const data = await res.json();
      setReferralCode(data.referralCode);
    } catch {
      toast({ title: "Failed to get referral link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!referralCode) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}#/login?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copied", description: "Share it with your friends!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!referralCode) {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        data-testid="button-generate-referral"
        className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/40 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        style={{
          background: "linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)",
          backgroundSize: "200% 200%",
          animation: "invite-shimmer 3s ease-in-out infinite",
        }}
      >
        <Share2 className="w-3.5 h-3.5" />
        {loading ? "Loading..." : "Invite Friends"}
        <span
          className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: "linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)",
          }}
        />
        <style>{`
          @keyframes invite-shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 border border-border">
          <span className="text-[11px] text-muted-foreground">Referral:</span>
          <span className="text-xs font-mono font-medium text-primary">{referralCode}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 h-8"
          data-testid="button-copy-referral"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy Link"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-sm">
        Copy your invite link and send it to a friend. When they open it and create an account, you get <span className="text-primary font-medium">500 KC</span> and they get <span className="text-primary font-medium">500 KC</span> extra.
      </p>
    </div>
  );
}
