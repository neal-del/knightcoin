import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { formatKC } from "@/lib/format";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_LABELS, CATEGORY_COLORS, formatTimeLeft } from "@/components/MarketCard";
import { ArrowLeft, TrendingUp, Clock, Users, Info } from "lucide-react";
import type { Market, MarketOption } from "@shared/schema";

const OPTION_COLORS = [
  "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  "border-violet-500/30 bg-violet-500/10 text-violet-400",
  "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "border-pink-500/30 bg-pink-500/10 text-pink-400",
  "border-blue-500/30 bg-blue-500/10 text-blue-400",
  "border-orange-500/30 bg-orange-500/10 text-orange-400",
  "border-teal-500/30 bg-teal-500/10 text-teal-400",
];

export default function MarketDetail() {
  const [, params] = useRoute("/market/:id");
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [placing, setPlacing] = useState(false);

  const { data: market, isLoading } = useQuery<Market>({
    queryKey: ["/api/markets", params?.id],
    enabled: !!params?.id,
  });

  const isMulti = market?.marketType === "multi_outcome" || market?.marketType === "time_bracket";

  const { data: options } = useQuery<MarketOption[]>({
    queryKey: ["/api/markets", params?.id, "options"],
    enabled: !!params?.id && isMulti,
  });

  const handlePlaceBet = async () => {
    if (!user) {
      toast({ title: "Sign in to trade", description: "Create an account to start trading with KnightCoin.", variant: "destructive" });
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid KC amount.", variant: "destructive" });
      return;
    }
    if (amt > user.balance) {
      toast({ title: "Insufficient balance", description: `You have ${formatKC(user.balance)} KC.`, variant: "destructive" });
      return;
    }

    setPlacing(true);
    try {
      if (isMulti) {
        if (!selectedOption) {
          toast({ title: "Select an option", variant: "destructive" });
          setPlacing(false);
          return;
        }
        await apiRequest("POST", "/api/bets/multi", {
          marketId: params?.id,
          optionId: selectedOption,
          amount: amt,
        });
      } else {
        await apiRequest("POST", "/api/bets", {
          marketId: params?.id,
          position,
          amount: amt,
        });
      }
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/markets", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", params?.id, "options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets/user"] });
      setAmount("");

      if (isMulti) {
        const opt = options?.find((o) => o.id === selectedOption);
        toast({
          title: "Bet placed",
          description: `${formatKC(amt)} KC on "${opt?.label}" at ${Math.round((opt?.price || 0.5) * 100)}¢`,
        });
      } else {
        toast({
          title: "Bet placed",
          description: `${formatKC(amt)} KC on ${position.toUpperCase()} at ${Math.round((position === "yes" ? market!.yesPrice : market!.noPrice) * 100)}¢`,
        });
      }
    } catch (err: any) {
      toast({ title: "Failed to place bet", description: err.message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-[900px] mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-[900px] mx-auto text-center py-20">
        <p className="text-muted-foreground">Market not found.</p>
        <Link href="/markets">
          <Button variant="outline" className="mt-4">Back to Markets</Button>
        </Link>
      </div>
    );
  }

  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = Math.round(market.noPrice * 100);
  const selectedOpt = options?.find((o) => o.id === selectedOption);
  const selectedPrice = isMulti ? (selectedOpt?.price || 0.5) : (position === "yes" ? market.yesPrice : market.noPrice);
  const potentialPayout = amount ? (parseFloat(amount) / selectedPrice).toFixed(2) : "0";
  const isSchool = ["sports", "academic", "social", "campus", "admin"].includes(market.category);

  return (
    <div className="px-4 md:px-8 py-6 max-w-[900px] mx-auto space-y-6">
      {/* Back link */}
      <Link href="/markets">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left — Market Info */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${CATEGORY_COLORS[market.category] || ""}`}>
                {isSchool ? "🏫 " : ""}{CATEGORY_LABELS[market.category] || market.category}
              </Badge>
              {market.subcategory && (
                <span className="text-xs text-muted-foreground">{market.subcategory}</span>
              )}
              {market.featured && (
                <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Featured</Badge>
              )}
              {isMulti && (
                <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                  {market.marketType === "time_bracket" ? "Time Bracket" : "Multi-Outcome"}
                </Badge>
              )}
            </div>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{market.icon}</span>
              <h1 className="text-xl font-bold text-foreground leading-tight" data-testid="text-market-title">
                {market.title}
              </h1>
            </div>
          </div>

          {/* Price display */}
          {isMulti && options ? (
            <div className="space-y-2">
              {options.map((opt, i) => {
                const pct = Math.round(opt.price * 100);
                const color = OPTION_COLORS[i % OPTION_COLORS.length];
                return (
                  <div key={opt.id} className={`rounded-xl border p-3 ${color}`} data-testid={`option-price-${opt.id}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-lg font-bold tabular-nums">{pct}¢</span>
                    </div>
                    <div className="mt-1.5 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-current opacity-40" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Yes</div>
                <div className="text-3xl font-bold text-emerald-400 tabular-nums" data-testid="text-yes-price">{yesPercent}¢</div>
                <div className="text-[10px] text-muted-foreground mt-1">{yesPercent}% chance</div>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
                <div className="text-xs text-rose-400 uppercase tracking-wider mb-1">No</div>
                <div className="text-3xl font-bold text-rose-400 tabular-nums" data-testid="text-no-price">{noPercent}¢</div>
                <div className="text-[10px] text-muted-foreground mt-1">{noPercent}% chance</div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <strong className="text-foreground">{formatKC(market.volume)}</strong> KC volume
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <strong className="text-foreground">{market.totalBets}</strong> trades
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatTimeLeft(market.closesAt)}
            </span>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Resolution Criteria</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {market.description}
            </p>
          </div>
        </div>

        {/* Right — Trading panel */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">Place a Trade</h3>

            {/* Position toggle / option selector */}
            {isMulti && options ? (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">Select an option</label>
                {options.map((opt, i) => {
                  const pct = Math.round(opt.price * 100);
                  const isSelected = selectedOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOption(opt.id)}
                      className={`w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between ${
                        isSelected
                          ? `${OPTION_COLORS[i % OPTION_COLORS.length]} border`
                          : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
                      }`}
                      data-testid={`button-option-${opt.id}`}
                    >
                      <span>{opt.label}</span>
                      <span className="tabular-nums">{pct}¢</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPosition("yes")}
                  className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                    position === "yes"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-green"
                      : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
                  }`}
                  data-testid="button-position-yes"
                >
                  Buy Yes — {yesPercent}¢
                </button>
                <button
                  onClick={() => setPosition("no")}
                  className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                    position === "no"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 glow-red"
                      : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
                  }`}
                  data-testid="button-position-no"
                >
                  Buy No — {noPercent}¢
                </button>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount (KC)</label>
              <Input
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted/30 text-base tabular-nums"
                min="1"
                data-testid="input-bet-amount"
              />
              {user && (
                <div className="flex gap-2 mt-2">
                  {[10, 25, 50, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 py-1 text-[11px] rounded bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {v} KC
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payout estimate */}
            {amount && parseFloat(amount) > 0 && (
              <div className="rounded-lg bg-muted/20 p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Avg price</span>
                  <span className="tabular-nums">{Math.round(selectedPrice * 100)}¢</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Shares</span>
                  <span className="tabular-nums">{potentialPayout}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-1.5">
                  <span>Potential payout</span>
                  <span className="text-primary tabular-nums">{formatKC(parseFloat(potentialPayout))} KC</span>
                </div>
              </div>
            )}

            <Button
              onClick={handlePlaceBet}
              disabled={placing || !amount || (isMulti && !selectedOption)}
              className="w-full font-semibold"
              data-testid="button-place-bet"
            >
              {placing ? "Placing..." : isMulti ? (selectedOpt ? `Buy "${selectedOpt.label}"` : "Select an option") : `Buy ${position.toUpperCase()}`}
            </Button>

            {!user && (
              <p className="text-[11px] text-center text-muted-foreground">
                <Link href="/login">
                  <span className="text-primary hover:underline cursor-pointer">Sign in</span>
                </Link>
                {" "}to place trades
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
