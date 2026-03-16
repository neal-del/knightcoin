import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, Gift, TrendingUp } from "lucide-react";
import type { Bet, Transaction, Market } from "@shared/schema";

export default function Portfolio() {
  const { user } = useAuth();

  const { data: bets, isLoading: betsLoading } = useQuery<Bet[]>({
    queryKey: ["/api/bets/user"],
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user,
  });

  const { data: markets } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const marketMap = new Map(markets?.map((m) => [m.id, m]) || []);

  if (!user) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-[900px] mx-auto text-center py-20">
        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Your Portfolio</h1>
        <p className="text-sm text-muted-foreground mb-4">Sign in to view your KnightCoin portfolio and trade history.</p>
        <Link href="/login">
          <Button data-testid="button-portfolio-login">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1000px] mx-auto space-y-8">
      <h1 className="text-xl font-bold text-foreground">Portfolio</h1>

      {/* Wallet overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Balance"
          value={`${user.balance.toLocaleString()} KC`}
          icon={<Wallet className="w-4 h-4" />}
          color="text-primary"
        />
        <StatCard
          label="Total Bets"
          value={String(user.totalBets)}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-foreground"
        />
        <StatCard
          label="Total Winnings"
          value={`${user.totalWinnings.toLocaleString()} KC`}
          icon={<ArrowUpRight className="w-4 h-4" />}
          color="text-emerald-400"
        />
        <StatCard
          label="Accuracy"
          value={user.totalBets > 0 ? `${Math.round((user.correctPredictions / user.totalBets) * 100)}%` : "—"}
          icon={<Gift className="w-4 h-4" />}
          color="text-orange-400"
        />
      </div>

      {/* Active positions */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Active Positions</h2>
        {betsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : bets && bets.length > 0 ? (
          <div className="space-y-2">
            {bets.map((bet) => {
              const market = marketMap.get(bet.marketId);
              return (
                <Link key={bet.id} href={`/market/${bet.marketId}`}>
                  <div
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors cursor-pointer"
                    data-testid={`card-bet-${bet.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-lg">{market?.icon || "📊"}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {market?.title || "Unknown market"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(bet.createdAt).toLocaleDateString()} · Bought at {Math.round(bet.price * 100)}¢
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <Badge
                        className={`text-[10px] px-2 py-0.5 font-semibold ${
                          bet.position === "yes"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                        variant="outline"
                      >
                        {bet.position.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-bold text-foreground tabular-nums">{bet.amount} KC</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground mb-2">No positions yet.</p>
            <Link href="/markets">
              <Button variant="outline" size="sm">Browse Markets</Button>
            </Link>
          </div>
        )}
      </section>

      {/* Transaction history */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Transaction History</h2>
        {txLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted/20 transition-colors"
                data-testid={`row-transaction-${tx.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.amount >= 0
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {tx.amount >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold tabular-nums ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount} KC
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No transactions yet.
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
