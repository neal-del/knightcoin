import { Link } from "wouter";
import { formatKC } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Users } from "lucide-react";
import type { Market, MarketOption } from "@shared/schema";

const CATEGORY_COLORS: Record<string, string> = {
  sports: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  academic: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  social: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  campus: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  politics: "bg-red-500/10 text-red-400 border-red-500/20",
  "pro-sports": "bg-green-500/10 text-green-400 border-green-500/20",
  tech: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  crypto: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  sports: "School Sports",
  academic: "Academic",
  social: "Social & Fun",
  campus: "Campus & Policy",
  admin: "Admin & Policy",
  politics: "Politics",
  "pro-sports": "Pro Sports",
  tech: "Tech & Business",
  crypto: "Crypto",
};

function formatTimeLeft(closesAt: string): string {
  const now = new Date();
  const close = new Date(closesAt);
  const diff = close.getTime() - now.getTime();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

const OPTION_COLORS = [
  "text-cyan-400 bg-cyan-500/20",
  "text-violet-400 bg-violet-500/20",
  "text-amber-400 bg-amber-500/20",
  "text-emerald-400 bg-emerald-500/20",
  "text-pink-400 bg-pink-500/20",
  "text-blue-400 bg-blue-500/20",
];

export default function MarketCard({ market }: { market: Market }) {
  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = Math.round(market.noPrice * 100);
  const isSchool = ["sports", "academic", "social", "campus", "admin"].includes(market.category);
  const isMulti = market.marketType === "multi_outcome" || market.marketType === "time_bracket";

  const { data: options } = useQuery<MarketOption[]>({
    queryKey: ["/api/markets", market.id, "options"],
    enabled: isMulti,
  });

  return (
    <Link href={`/market/${market.id}`}>
      <div
        className="group border border-border rounded-xl p-4 bg-card hover:border-primary/30 transition-all cursor-pointer"
        data-testid={`card-market-${market.id}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-xl shrink-0 mt-0.5">{market.icon}</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {market.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${CATEGORY_COLORS[market.category] || ""}`}>
                  {isSchool ? "🏫 " : ""}{CATEGORY_LABELS[market.category] || market.category}
                </Badge>
                {market.subcategory && (
                  <span className="text-[10px] text-muted-foreground">{market.subcategory}</span>
                )}
                {isMulti && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border bg-violet-500/10 text-violet-400 border-violet-500/20">
                    {market.marketType === "time_bracket" ? "Time" : "Multi"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Price bars */}
        {isMulti && options && options.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {[...options].sort((a, b) => b.price - a.price).slice(0, 3).map((opt, i) => {
              const pct = Math.round(opt.price * 100);
              const color = OPTION_COLORS[i % OPTION_COLORS.length];
              return (
                <div key={opt.id} className="flex items-center gap-2" data-testid={`card-option-${opt.id}`}>
                  <span className={`text-xs font-medium w-20 truncate ${color.split(" ")[0]}`}>{opt.label}</span>
                  <div className="flex-1 h-5 bg-muted/50 rounded-md overflow-hidden relative">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-md transition-all ${color.split(" ")[1]}`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums ${color.split(" ")[0]}`}>
                      {pct}¢
                    </span>
                  </div>
                </div>
              );
            })}
            {options.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{options.length - 3} more</span>
            )}
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium w-8 text-emerald-400">Yes</span>
              <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500/20 rounded-md transition-all"
                  style={{ width: `${yesPercent}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-400 tabular-nums">
                  {yesPercent}¢
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium w-8 text-rose-400">No</span>
              <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-rose-500/20 rounded-md transition-all"
                  style={{ width: `${noPercent}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-rose-400 tabular-nums">
                  {noPercent}¢
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {formatKC(market.volume)} KC
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {market.totalBets}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeLeft(market.closesAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export { CATEGORY_COLORS, CATEGORY_LABELS, formatTimeLeft };
