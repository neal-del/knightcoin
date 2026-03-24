import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { WalletProvider } from "@/lib/wallet";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Markets from "@/pages/Markets";
import MarketDetail from "@/pages/MarketDetail";
import Portfolio from "@/pages/Portfolio";
import Wallet from "@/pages/Wallet";
import Leaderboard from "@/pages/Leaderboard";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminMarkets from "@/pages/AdminMarkets";
import AdminCreateMarket from "@/pages/AdminCreateMarket";
import AdminResolve from "@/pages/AdminResolve";
import AdminUsers from "@/pages/AdminUsers";
import AdminEditMarket from "@/pages/AdminEditMarket";
import AdminRequests from "@/pages/AdminRequests";
import RequestMarket from "@/pages/RequestMarket";
import Policies from "@/pages/Policies";
import Mailbox from "@/pages/Mailbox";
import AdminMessages from "@/pages/AdminMessages";
import NotFound from "@/pages/not-found";

// Route guard: redirects non-admins to home
function AdminGuard({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect to="/" />;
  return <Component />;
}

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/markets" component={Markets} />
        <Route path="/market/:id" component={MarketDetail} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/login" component={Login} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin">{() => <AdminGuard component={AdminDashboard} />}</Route>
        <Route path="/admin/markets">{() => <AdminGuard component={AdminMarkets} />}</Route>
        <Route path="/admin/markets/new">{() => <AdminGuard component={AdminCreateMarket} />}</Route>
        <Route path="/admin/markets/:id/edit">{(params) => <AdminGuard component={() => <AdminEditMarket {...params} />} />}</Route>
        <Route path="/admin/resolve">{() => <AdminGuard component={AdminResolve} />}</Route>
        <Route path="/admin/users">{() => <AdminGuard component={AdminUsers} />}</Route>
        <Route path="/admin/requests">{() => <AdminGuard component={AdminRequests} />}</Route>
        <Route path="/request-market" component={RequestMarket} />
        <Route path="/mailbox" component={Mailbox} />
        <Route path="/admin/messages">{() => <AdminGuard component={AdminMessages} />}</Route>
        <Route path="/policies" component={Policies} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// Redirect non-hash URLs to hash-based routes (fixes referral links, shared links, etc.)
// e.g. /login?ref=CODE → /#/login?ref=CODE
(function redirectToHash() {
  const { pathname, search, hash } = window.location;
  if (pathname !== '/' && !hash) {
    // The URL has a path but no hash — convert path to hash route
    window.location.replace(`${window.location.origin}/#${pathname}${search}`);
  }
})();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </TooltipProvider>
          </WalletProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
