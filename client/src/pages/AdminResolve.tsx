import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatKC } from "@/lib/format";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Undo2,
  Zap,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Market, MarketOption } from "@shared/schema";
import { CATEGORY_LABELS } from "@/components/MarketCard";
import { useState } from "react";

/** Sub-component: resolution controls for a single multi-option market */
function MultiOptionResolver({ market, resolving, setResolving }: {
  market: Market;
  resolving: string | null;
  setResolving: (id: string | null) => void;
}) {
  const { toast } = useToast();
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { data: options, isLoading } = useQuery<MarketOption[]>({
    queryKey: ["/api/markets", market.id, "options"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/markets/${market.id}/options`);
      return res.json();
    },
  });

  const resolveWithWinner = async () => {
    if (!selectedWinner) return;
    setResolving(market.id);
    try {
      const res = await apiRequest("POST", `/api/admin/markets/${market.id}/resolve-option`, {
        winnerOptionId: selectedWinner,
      });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      const winnerLabel = options?.find((o) => o.id === selectedWinner)?.label || "selected option";
      toast({
        title: `Resolved: ${winnerLabel} wins`,
        description: `${data.settledBets} bets settled and paid out`,
      });
      setSelectedWinner(null);
    } catch {
      toast({ title: "Resolution failed", variant: "destructive" });
    } finally {
      setResolving(null);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-24 rounded-lg" />;
  }

  if (!options || options.length === 0) {
    return <p className="text-xs text-muted-foreground">No options found for this market.</p>;
  }

  const visibleOptions = expanded ? options : options.slice(0, 5);
  const hasMore = options.length > 5;

  return (
    <div className="space-y-3 w-full min-w-[200px]">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Pick the winning option
      </div>
      <div className="space-y-1.5">
        {visibleOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedWinner(opt.id === selectedWinner ? null : opt.id)}
            disabled={resolving === market.id}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all text-xs ${
              opt.id === selectedWinner
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                : "border-border bg-card/50 text-foreground hover:border-primary/30 hover:bg-primary/5"
            }`}
            data-testid={`option-resolve-${opt.id}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {opt.id === selectedWinner && <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              <span className="truncate font-medium">{opt.label}</span>
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 ml-2">
              {Math.round(opt.price * 100)}¢
            </span>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Show fewer</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show all {options.length} options</>
          )}
        </button>
      )}

      <Button
        size="sm"
        onClick={resolveWithWinner}
        disabled={!selectedWinner || resolving === market.id}
        className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
        data-testid={`button-resolve-winner-${market.id}`}
      >
        <Trophy className="w-3.5 h-3.5" />
        {resolving === market.id
          ? "Resolving..."
          : selectedWinner
            ? `Resolve: ${options.find((o) => o.id === selectedWinner)?.label}`
            : "Select a winner above"}
      </Button>
    </div>
  );
}

export default function AdminResolve() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loc] = useLocation();
  const [resolving, setResolving] = useState<string | null>(null);

  // Parse ?id= from URL
  const searchParams = new URLSearchParams(loc.split("?")[1] || "");
  const focusId = searchParams.get("id");

  const { data: markets, isLoading } = useQuery<Market[]>({
    queryKey: ["/api/admin/markets"],
    enabled: isAdmin,
  });

  const activeMarkets = markets?.filter((m) => !m.resolved) || [];
  const resolvedMarkets = markets?.filter((m) => m.resolved) || [];

  // If focusId provided, bring that market to top
  const sortedActive = focusId
    ? [...activeMarkets].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
    : activeMarkets;

  const resolveMarket = async (marketId: string, outcome: boolean) => {
    setResolving(marketId);
    try {
      const res = await apiRequest("POST", `/api/admin/markets/${marketId}/resolve`, { outcome });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({
        title: `Resolved as ${outcome ? "YES" : "NO"}`,
        description: `${data.settledBets} bets settled and paid out`,
      });
    } catch {
      toast({ title: "Resolution failed", variant: "destructive" });
    } finally {
      setResolving(null);
    }
  };

  const unresolveMarket = async (marketId: string) => {
    try {
      await apiRequest("POST", `/api/admin/markets/${marketId}/unresolve`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({ title: "Market unresolved" });
    } catch {
      toast({ title: "Failed to unresolve", variant: "destructive" });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <Link href="/admin">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2">
            <ArrowLeft className="w-3 h-3" /> Admin Panel
          </span>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Resolve Markets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resolve markets to settle bets and distribute payouts. For multi-option markets, select the winning option.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Active markets */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              Active Markets ({activeMarkets.length})
            </h2>
            <div className="space-y-3">
              {sortedActive.map((market) => {
                let resConfig: any = null;
                try {
                  resConfig = market.resolutionData ? JSON.parse(market.resolutionData) : null;
                } catch { }

                const isHighlighted = market.id === focusId;
                const isMulti = market.marketType === "multi_outcome" || market.marketType === "time_bracket";

                return (
                  <div
                    key={market.id}
                    className={`rounded-xl border bg-card p-5 ${isHighlighted ? "border-primary/50 bg-primary/5" : "border-border"}`}
                    data-testid={`resolve-market-${market.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{market.icon}</span>
                          <h3 className="text-sm font-semibold text-foreground">{market.title}</h3>
                          {isMulti && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20" variant="outline">
                              {market.marketType === "time_bracket" ? "Time Bracket" : "Multi-Option"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{market.description}</p>

                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span>{CATEGORY_LABELS[market.category] || market.category}</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {formatKC(market.volume)} KC
                          </span>
                          <span>{market.totalBets} bets</span>
                          <span>
                            Closes: {new Date(market.closesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>

                        {/* Resolution info */}
                        {market.resolutionSource !== "manual" && resConfig && (
                          <div className="mt-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 px-3 py-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-yellow-400 font-medium mb-1">
                              <Zap className="w-3 h-3" />
                              Auto-Resolution: {market.resolutionSource?.replace("api_", "").toUpperCase()}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {resConfig.ticker && <>Ticker: <strong className="text-foreground">{resConfig.ticker}</strong> — </>}
                              {resConfig.symbol && <>Symbol: <strong className="text-foreground">{resConfig.symbol}</strong> — </>}
                              {resConfig.targetPrice && <>Target: <strong className="text-foreground">${resConfig.targetPrice.toLocaleString()}</strong> — </>}
                              {resConfig.condition && <>Condition: <strong className="text-foreground">{resConfig.condition}</strong></>}
                              {resConfig.topic && <>Topic: <strong className="text-foreground">{resConfig.topic}</strong></>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resolution controls — different for binary vs multi */}
                      {isMulti ? (
                        <MultiOptionResolver
                          market={market}
                          resolving={resolving}
                          setResolving={setResolving}
                        />
                      ) : (
                        <div className="flex flex-col gap-2 shrink-0">
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div className="text-center">
                              <div className="text-[10px] text-muted-foreground mb-0.5">YES</div>
                              <div className="text-sm font-bold text-emerald-400 tabular-nums">{Math.round(market.yesPrice * 100)}¢</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] text-muted-foreground mb-0.5">NO</div>
                              <div className="text-sm font-bold text-rose-400 tabular-nums">{Math.round(market.noPrice * 100)}¢</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => resolveMarket(market.id, true)}
                            disabled={resolving === market.id}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            data-testid={`button-resolve-yes-${market.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resolve YES
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveMarket(market.id, false)}
                            disabled={resolving === market.id}
                            className="gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs"
                            data-testid={`button-resolve-no-${market.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Resolve NO
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {activeMarkets.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No active markets to resolve.</p>
              )}
            </div>
          </div>

          {/* Recently resolved */}
          {resolvedMarkets.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Recently Resolved ({resolvedMarkets.length})
              </h2>
              <div className="space-y-2">
                {resolvedMarkets.map((market) => (
                  <div
                    key={market.id}
                    className="rounded-xl border border-border bg-card/50 p-4 flex items-center gap-4"
                  >
                    <span className="text-lg">{market.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{market.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <Badge className={`text-[9px] px-1.5 py-0 ${market.outcome ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                          {market.outcome ? "YES" : "NO"}
                        </Badge>
                        <span>Resolved {market.resolvedAt ? new Date(market.resolvedAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => unresolveMarket(market.id)}
                      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      title="Unresolve (revert)"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
