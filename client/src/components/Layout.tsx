import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Trophy,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
  Settings,
  CheckCircle2,
  Users,
  PlusCircle,
  Coins,
  MessageSquarePlus,
  MessageSquare,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { queryClient } from "@/lib/queryClient";
import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/wallet", label: "Wallet", icon: Coins },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/request-market", label: "Request", icon: MessageSquarePlus },
  { href: "/policies", label: "Policies", icon: ScrollText },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/markets", label: "Markets", icon: Settings },
  { href: "/admin/markets/new", label: "Create", icon: PlusCircle },
  { href: "/admin/resolve", label: "Resolve", icon: CheckCircle2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/requests", label: "Requests", icon: MessageSquare },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    // Small delay so spinner is visible
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const isAdminPage = location.startsWith("/admin");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card/50 fixed inset-y-0 left-0 z-40" data-testid="sidebar">
        <div className="p-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <KnightCoinLogo />
            <div>
              <span className="text-sm font-bold tracking-tight text-foreground">KnightCoin</span>
              <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Prediction Market</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href === "/markets" && location.startsWith("/market/"));
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    active && !isAdminPage
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </div>
              </Link>
            );
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold">Admin</span>
              </div>
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
                const active = location === href;
                return (
                  <Link key={href} href={href}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      data-testid={`nav-admin-${label.toLowerCase()}`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Wallet summary */}
        {user && (
          <div className="mx-3 mb-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Balance</div>
            <div className="text-lg font-bold text-primary tabular-nums" data-testid="text-balance">
              {user.balance.toLocaleString()} KC
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary font-medium">Admin</span>
              </div>
            )}
          </div>
        )}

        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                data-testid="button-theme-toggle"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleRefresh}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                data-testid="button-refresh"
                aria-label="Refresh data"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            {user ? (
              <button
                onClick={logout}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link href="/login">
                <div className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer" data-testid="link-login">
                  <LogIn className="w-4 h-4" />
                </div>
              </Link>
            )}
          </div>
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <KnightCoinLogo size={24} />
            <span className="text-sm font-bold text-foreground">KnightCoin</span>
          </Link>
          <div className="flex items-center gap-1">
            {user && (
              <span className="text-xs font-bold text-primary tabular-nums mr-1" data-testid="text-mobile-balance">
                {user.balance.toLocaleString()} KC
              </span>
            )}
            <button
              onClick={handleRefresh}
              className="p-2 text-muted-foreground"
              data-testid="button-mobile-refresh"
              aria-label="Refresh data"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-muted-foreground"
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="bg-card border-b border-border py-2 px-4 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <div
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </div>
              </Link>
            ))}
            {isAdmin && (
              <>
                <div className="pt-2 pb-1 px-3">
                  <span className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold">Admin</span>
                </div>
                {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <div
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                  </Link>
                ))}
              </>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button onClick={toggleTheme} className="p-2 text-muted-foreground">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {user ? (
                <button onClick={() => { logout(); setMobileOpen(false); }} className="p-2 text-muted-foreground">
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <Link href="/login">
                  <div onClick={() => setMobileOpen(false)} className="p-2 text-muted-foreground cursor-pointer">
                    <LogIn className="w-4 h-4" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="pt-14 md:pt-0 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function KnightCoinLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="KnightCoin logo"
    >
      {/* Outer coin ring */}
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="0.5" className="text-primary/40" />
      {/* Knight chess piece silhouette */}
      <path
        d="M16 28h8v1H16v-1zm1-1h6l1-4h-1l-1-3v-3l2-2-1-1-2 1-1-2h-2l-1 2-2-1-1 1 2 2v3l-1 3h-1l1 4z"
        fill="currentColor"
        className="text-primary"
      />
      {/* K letter subtle */}
      <text x="20" y="36" textAnchor="middle" fontSize="5" fontWeight="700" fill="currentColor" className="text-primary/60">KC</text>
    </svg>
  );
}
