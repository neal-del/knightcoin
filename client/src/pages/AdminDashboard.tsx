import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatKC } from "@/lib/format";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  BarChart3,
  Coins,
  CheckCircle2,
  Activity,
  PlusCircle,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminStats {
  totalUsers: number;
  totalMarkets: number;
  activeMarkets: number;
  resolvedMarkets: number;
  totalBets: number;
  totalVolume: number;
  totalKCInCirculation: number;
  totalTransactions: number;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sign in with your admin credentials to access this panel.
          </p>
          <Link href="/admin/login">
            <Button>Admin Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
        { label: "Active Markets", value: stats.activeMarkets, icon: Activity, color: "text-emerald-400" },
        { label: "Resolved", value: stats.resolvedMarkets, icon: CheckCircle2, color: "text-purple-400" },
        { label: "Total Bets", value: stats.totalBets, icon: BarChart3, color: "text-orange-400" },
        { label: "Total Volume", value: `${formatKC(stats.totalVolume)} KC`, icon: TrendingUp, color: "text-primary" },
        { label: "KC in Circulation", value: `${formatKC(stats.totalKCInCirculation)} KC`, icon: Coins, color: "text-yellow-400" },
      ]
    : [];

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">Admin Panel</span>
          </div>
          <h1 className="text-xl font-bold text-foreground" data-testid="text-admin-title">
            Welcome, {user?.displayName}
          </h1>
        </div>
        <Link href="/admin/markets/new">
          <Button className="gap-2" data-testid="button-create-market">
            <PlusCircle className="w-4 h-4" />
            New Market
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-lg font-bold text-foreground tabular-nums">
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/markets">
          <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer group">
            <Settings className="w-5 h-5 text-primary mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Manage Markets</h3>
            <p className="text-xs text-muted-foreground">Create, edit, feature, or delete markets. Resolve bets and manage outcomes.</p>
          </div>
        </Link>

        <Link href="/admin/resolve">
          <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer group">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Resolve Markets</h3>
            <p className="text-xs text-muted-foreground">Manually resolve school bets or check auto-resolution status for macro markets.</p>
          </div>
        </Link>

        <Link href="/admin/users">
          <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer group">
            <Users className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Manage Users</h3>
            <p className="text-xs text-muted-foreground">View all users, adjust balances, grant or deduct KnightCoin.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
