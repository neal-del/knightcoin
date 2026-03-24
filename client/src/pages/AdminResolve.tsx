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
  History,
} from "lucide-react";
import type { Market, MarketOption } from "@shared/schema";
import { CATEGORY_LABELS } from "@/components/MarketCard";
import { useState } from "react";

interface EnrichedBet {
  id: string;
  userId: string;
  displayName: string;
  position: string;
  amount: number;
  price: number;
  settled: boolean;
  payout: number | null;
  createdAt: string;
}

/** Sub-component: collapsible bet history for a market */
function MarketBetHistory({ marketId }: { marketId: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data: bets, isLoading } = useQuery<EnrichedBet[]>({
    queryKey: ["/api/admin/markets", marketId, "bets"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/markets/${marketId}/bets`);
      return res.json();
    },
    enabled: expanded, // only fetch when expanded
  });

  return (
    <div className="border-t border-border pt-3 mt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        {expanded ? "Hide" : "Show"} Bet History
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-3">
          {isLoading ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 rounded" />)}
            </div>
          ) : bets && bets.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-3 py-2 bg-muted/30 text-[9px] uppercase tracking-widest text-muted-foreground">
                <span>User</span>
                <span className="text-right">Side</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Price</span>
                <span className="text-right">Time</span>
              </div>
              {bets.map((bet) => (
                <div
                  key={bet.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-3 py-2 border-t border-border/50 text-xs"
                >
                  <span className="text-foreground font-medium truncate">{bet.displayName}</span>
                  <span className={`text-right font-semibold ${
                    bet.position === "YES" ? "text-emerald-400" : bet.position === "NO" ? "text-rose-400" : "text-violet-400"
                  }`}>
                    {bet.position}
                  </span>
                  <span className="text-right text-foreground tabular-nums">{formatKC(bet.amount)} KC</span>
                  <span className="text-right text-muted-foreground tabular-nums">{Math.round(bet.price * 100)}¢</span>
                  <span className="text-right text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(bet.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No bets placed on this market yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Sub-component: resolution controls for a single multi-option market */
function MultiOptionResolver({ market, resolving, setResolving }: {
  market: Market;
  resolving: string | null;
  setResolving: (id: string | null) => void;
}) {
  const { toast } = useToast();
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [selectedWinners, setSelectedWinners] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [eliminating, setEliminating] = useState<string | null>(null);

  const isExclusive = market.exclusiveMulti !== false;

  const { data: options, isLoading } = useQuery<MarketOption[]>({
    queryKey: ["/api/markets", market.id, "options"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/markets/${market.id}/options`);
      return res.json();
    },
  });

  const toggleWinner = (optId: string) => {
    setSelectedWinners((prev) => {
      const next = new Set(prev);
      if (next.has(optId)) {
        next.delete(optId);
      } else {
        next.add(optId);
      }
      return next;
    });
  };

  const eliminateOption = async (optionId: string) => {
    const opt = options?.find((o) => o.id === optionId);
    if (!opt) return;
    if (!confirm(`Eliminate "${opt.label}"? All bets on this option will be settled as losses.`)) return;

    setEliminating(optionId);
    try {
      const res = await apiRequest("POST", `/api/admin/markets/${market.id}/eliminate-option`, { optionId });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/markets", market.id, "options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({
        title: `Eliminated: ${data.eliminated}`,
        description: `${data.settledBets} bet${data.settledBets !== 1 ? "s" : ""} settled${data.autoResolved ? " — market auto-resolved (last option wins)" : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Elimination failed", description: err?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setEliminating(null);
    }
  };

  const resolveWithWinner = async () => {
    if (isExclusive && !selectedWinner) return;
    if (!isExclusive && selectedWinners.size === 0) return;

    setResolving(market.id);
    try {
      const body = isExclusive
        ? { winnerOptionId: selectedWinner }
        : { winnerOptionIds: Array.from(selectedWinners) };
      const res = await apiRequest("POST", `/api/admin/markets/${market.id}/resolve-option`, body);
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });

      if (isExclusive) {
        const winnerLabel = options?.find((o) => o.id === selectedWinner)?.label || "selected option";
        toast({
          title: `Resolved: ${winnerLabel} wins`,
          description: `${data.settledBets} bets settled and paid out`,
        });
      } else {
        const winnerLabels = options?.filter((o) => selectedWinners.has(o.id)).map((o) => o.label).join(", ") || "selected options";
        toast({
          title: `Resolved: ${selectedWinners.size} winner${selectedWinners.size > 1 ? "s" : ""}`,
          description: `${winnerLabels} — ${data.settledBets} bets settled`,
        });
      }
      setSelectedWinner(null);
      setSelectedWinners(new Set());
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

  const hasSelection = isExclusive ? !!selectedWinner : selectedWinners.size > 0;

  const resolveButtonLabel = () => {
    if (resolving === market.id) return "Resolving...";
    if (isExclusive) {
      return selectedWinner
        ? `Resolve: ${options.find((o) => o.id === selectedWinner)?.label}`
        : "Select a winner above";
    }
    if (selectedWinners.size === 0) return "Select winners above";
    const labels = options.filter((o) => selectedWinners.has(o.id)).map((o) => o.label);
    return `Resolve ${labels.length} winner${labels.length > 1 ? "s" : ""}: ${labels.join(", ")}`;
  };

  const activeOptions = options?.filter((o) => !o.resolved) || [];
  const eliminatedOptions = options?.filter((o) => o.resolved) || [];

  return (
    <div className="space-y-3 w-full">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {isExclusive ? "Pick the winning option" : "Select all winning options (multiple allowed)"}
      </div>
      {!isExclusive && (
        <p className="text-[11px] text-amber-400">
          This is a non-mutually-exclusive market. You can resolve multiple options as winners.
        </p>
      )}
      {isExclusive && eliminatedOptions.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {eliminatedOptions.length} option{eliminatedOptions.length > 1 ? "s" : ""} eliminated · {activeOptions.length} remaining
        </p>
      )}

      {/* Active options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {(expanded ? activeOptions : activeOptions.slice(0, 5)).map((opt) => {
          const isSelected = isExclusive
            ? opt.id === selectedWinner
            : selectedWinners.has(opt.id);

          return (
            <div key={opt.id} className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => {
                  if (isExclusive) {
                    setSelectedWinner(opt.id === selectedWinner ? null : opt.id);
                  } else {
                    toggleWinner(opt.id);
                  }
                }}
                disabled={resolving === market.id}
                className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all text-xs ${
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "border-border bg-card/50 text-foreground hover:border-primary/30 hover:bg-primary/5"
                }`}
                data-testid={`option-resolve-${opt.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isSelected && <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  <span className="truncate font-medium">{opt.label}</span>
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 ml-2">
                  {Math.round(opt.price * 100)}¢
                </span>
              </button>
              {isExclusive && activeOptions.length >= 2 && (
                <button
                  type="button"
                  onClick={() => eliminateOption(opt.id)}
                  disabled={eliminating === opt.id || resolving === market.id}
                  className="px-2 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-400 hover:bg-rose-500/15 transition-colors text-[10px] shrink-0"
                  title={`Eliminate "${opt.label}"`}
                  data-testid={`option-eliminate-${opt.id}`}
                >
                  {eliminating === opt.id ? "…" : <XCircle className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Eliminated options (collapsed) */}
      {isExclusive && eliminatedOptions.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Eliminated</div>
          <div className="flex flex-wrap gap-1.5">
            {eliminatedOptions.map((opt) => (
              <span key={opt.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/20 text-[11px] text-muted-foreground/50 line-through">
                <XCircle className="w-3 h-3" />
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeOptions.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Show fewer</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show all {activeOptions.length} options</>
          )}
        </button>
      )}

      <Button
        size="sm"
        onClick={resolveWithWinner}
        disabled={!hasSelection || resolving === market.id}
        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:max-w-xs"
        data-testid={`button-resolve-winner-${market.id}`}
      >
        <Trophy className="w-3.5 h-3.5" />
        {resolveButtonLabel()}
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
                    <div className={isMulti ? "space-y-4" : "flex items-start justify-between gap-4"}>
                      <div className={isMulti ? "" : "flex-1 min-w-0"}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-lg">{market.icon}</span>
                          <h3 className="text-sm font-semibold text-foreground">{market.title}</h3>
                          {isMulti && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20" variant="outline">
                              {market.marketType === "time_bracket" ? "Time Bracket" : "Multi-Option"}
                            </Badge>
                          )}
                          {isMulti && market.exclusiveMulti === false && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20" variant="outline">
                              Non-Exclusive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{market.description}</p>

                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
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
                        <div className="border-t border-border pt-4">
                          <MultiOptionResolver
                            market={market}
                            resolving={resolving}
                            setResolving={setResolving}
                          />
                        </div>
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

                    {/* Bet History */}
                    <MarketBetHistory marketId={market.id} />
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
