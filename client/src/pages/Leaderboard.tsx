import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, TrendingUp } from "lucide-react";

interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string;
  balance: number;
  totalWinnings: number;
  totalBets: number;
  correctPredictions: number;
}

const RANK_STYLES: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-gray-300",
  3: "text-orange-400",
};

export default function Leaderboard() {
  const { data: users, isLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ["/api/leaderboard"],
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-[800px] mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">Top KnightCoin holders at Menlo School</p>
      </div>

      {/* Top 3 podium */}
      {!isLoading && users && users.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 0, 2].map((idx) => {
            const u = users[idx];
            const rank = idx + 1;
            const isFirst = rank === 1;
            return (
              <div
                key={u.id}
                className={`rounded-xl border border-border bg-card p-4 text-center ${
                  isFirst ? "ring-1 ring-yellow-500/20 bg-yellow-500/5 order-first md:order-none md:col-start-2" : ""
                } ${rank === 2 ? "md:col-start-1" : ""} ${rank === 3 ? "md:col-start-3" : ""}`}
                data-testid={`card-leaderboard-${rank}`}
              >
                <div className={`text-2xl font-bold mb-1 ${RANK_STYLES[rank] || "text-muted-foreground"}`}>
                  {rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉"}
                </div>
                <div className="text-sm font-semibold text-foreground truncate">{u.displayName}</div>
                <div className="text-lg font-bold text-primary tabular-nums mt-1">
                  {u.balance.toLocaleString()} KC
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {u.totalBets} bets · {u.correctPredictions} correct
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Rank</span>
            <span>Trader</span>
            <span className="text-right">Balance</span>
            <span className="text-right hidden md:block">Bets</span>
            <span className="text-right hidden md:block">Win Rate</span>
          </div>
          {users?.map((u, i) => {
            const rank = i + 1;
            const winRate = u.totalBets > 0
              ? Math.round((u.correctPredictions / u.totalBets) * 100)
              : 0;
            return (
              <div
                key={u.id}
                className="grid grid-cols-[3rem_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-t border-border hover:bg-muted/10 transition-colors"
                data-testid={`row-leaderboard-${rank}`}
              >
                <span className={`text-sm font-bold tabular-nums ${RANK_STYLES[rank] || "text-muted-foreground"}`}>
                  {rank <= 3 ? (
                    <Medal className={`w-4 h-4 inline ${RANK_STYLES[rank]}`} />
                  ) : (
                    `#${rank}`
                  )}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {u.displayName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{u.displayName}</span>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums text-right">
                  {u.balance.toLocaleString()} KC
                </span>
                <span className="text-xs text-muted-foreground tabular-nums text-right hidden md:block">
                  {u.totalBets}
                </span>
                <span className="text-xs tabular-nums text-right hidden md:flex items-center gap-1 justify-end">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">{winRate}%</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
