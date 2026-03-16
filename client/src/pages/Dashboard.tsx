import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import MarketCard from "@/components/MarketCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Zap, ArrowRight, Coins, Gift } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Market } from "@shared/schema";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();

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

  const handleClaimBonus = async () => {
    try {
      await apiRequest("POST", "/api/wallet/daily-bonus");
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    } catch {
      // Already claimed or error
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
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">KnightCoin Exchange</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2" data-testid="text-hero-title">
            Menlo School Prediction Market
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mb-4">
            Trade on school events, sports, academics, and real-world outcomes using KnightCoin — 
            Menlo's own Ethereum-based token. No real money, all the strategy.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {!user ? (
              <Link href="/login">
                <Button className="gap-2" data-testid="button-get-started">
                  <Zap className="w-4 h-4" />
                  Get Started — Earn 1,000 KC
                </Button>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-card/80 border border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Balance</div>
                    <div className="text-lg font-bold text-primary tabular-nums">{user.balance.toLocaleString()} KC</div>
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
                  data-testid="button-daily-bonus"
                >
                  <Gift className="w-3.5 h-3.5" />
                  Claim Daily 50 KC
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

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

      {/* How KnightCoin Works */}
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-base font-semibold text-foreground mb-4">How KnightCoin Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Earn KnightCoin</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get 1,000 KC when you sign up, plus 50 KC daily. KnightCoin is an ERC-20 token on the Ethereum network — no real money involved.
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
              Correct predictions pay out at 100¢ per share. Climb the leaderboard and earn bragging rights among Menlo Knights.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
