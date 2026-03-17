import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatKC } from "@/lib/format";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle,
  Star,
  StarOff,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Edit3,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Market } from "@shared/schema";
import { CATEGORY_LABELS } from "@/components/MarketCard";
import { useState } from "react";

export default function AdminMarkets() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  const { data: markets, isLoading } = useQuery<Market[]>({
    queryKey: ["/api/admin/markets"],
    enabled: isAdmin,
  });

  const filtered = markets?.filter((m) => {
    if (filter === "active") return !m.resolved;
    if (filter === "resolved") return m.resolved;
    return true;
  });

  const toggleFeatured = async (market: Market) => {
    try {
      await apiRequest("PATCH", `/api/admin/markets/${market.id}`, {
        featured: !market.featured,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({ title: market.featured ? "Unfeatured" : "Featured", description: market.title });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const deleteMarket = async (market: Market) => {
    if (!confirm(`Delete "${market.title}"? All unsettled bets will be refunded.`)) return;
    try {
      const res = await apiRequest("DELETE", `/api/admin/markets/${market.id}`);
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Market deleted", description: `${data.refundedBets} bets refunded` });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2">
              <ArrowLeft className="w-3 h-3" /> Admin Panel
            </span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Market Management</h1>
        </div>
        <Link href="/admin/markets/new">
          <Button className="gap-2" data-testid="button-new-market">
            <PlusCircle className="w-4 h-4" />
            New Market
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "active", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {markets && (
              <span className="ml-1.5 tabular-nums">
                ({f === "all" ? markets.length : filtered?.length || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Market list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((market) => (
            <div
              key={market.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
              data-testid={`admin-market-${market.id}`}
            >
              <span className="text-xl shrink-0">{market.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{market.title}</h3>
                  {market.featured && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shrink-0">
                      Featured
                    </Badge>
                  )}
                  {market.resolved && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                      {market.outcome ? "YES" : "NO"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{CATEGORY_LABELS[market.category] || market.category}</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {formatKC(market.volume)} KC
                  </span>
                  <span>{market.totalBets} bets</span>
                  <span className="flex items-center gap-1">
                    {market.resolutionSource === "manual" ? (
                      <><Clock className="w-3 h-3" /> Manual</>
                    ) : (
                      <><AlertTriangle className="w-3 h-3 text-yellow-400" /> {market.resolutionSource?.replace("api_", "").toUpperCase()}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!market.resolved && (
                  <>
                    <Link href={`/admin/markets/${market.id}/edit`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-8" data-testid={`button-edit-${market.id}`}>
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/admin/resolve?id=${market.id}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-8" data-testid={`button-resolve-${market.id}`}>
                        <CheckCircle2 className="w-3 h-3" />
                        Resolve
                      </Button>
                    </Link>
                  </>
                )}
                <button
                  onClick={() => toggleFeatured(market)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                  title={market.featured ? "Unfeature" : "Feature"}
                >
                  {market.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteMarket(market)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete"
                  data-testid={`button-delete-${market.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No markets found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
