import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
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
import NotFound from "@/pages/not-found";

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
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/markets" component={AdminMarkets} />
        <Route path="/admin/markets/new" component={AdminCreateMarket} />
        <Route path="/admin/resolve" component={AdminResolve} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

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
