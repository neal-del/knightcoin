import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatKC } from "@/lib/format";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Users,
  Coins,
  Shield,
  Search,
  Send,
} from "lucide-react";
import { useState } from "react";

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  balance: number;
  totalWinnings: number;
  totalBets: number;
  correctPredictions: number;
  createdAt: string | null;
}

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // Bulk grant
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const filtered = users?.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const adjustBalance = async (userId: string) => {
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || !adjustReason) {
      toast({ title: "Enter amount and reason", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/adjust-balance`, {
        amount: amt,
        reason: adjustReason,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: `${amt > 0 ? "Granted" : "Deducted"} ${Math.abs(amt)} KC` });
      setAdjustUserId(null);
      setAdjustAmount("");
      setAdjustReason("");
    } catch {
      toast({ title: "Failed to adjust", variant: "destructive" });
    }
  };

  const handleBulkGrant = async () => {
    const amt = parseFloat(bulkAmount);
    if (isNaN(amt) || !bulkReason) {
      toast({ title: "Enter amount and reason", variant: "destructive" });
      return;
    }
    setBulkLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/bulk-grant", { amount: amt, reason: bulkReason });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: `Granted ${amt} KC to ${data.usersAffected} users` });
      setBulkAmount("");
      setBulkReason("");
    } catch {
      toast({ title: "Bulk grant failed", variant: "destructive" });
    } finally {
      setBulkLoading(false);
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
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" /> User Management
        </h1>
      </div>

      {/* Bulk grant */}
      <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          Bulk KC Distribution
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-[150px]">
            <label className="text-[10px] text-muted-foreground mb-1 block">Amount</label>
            <Input
              type="number"
              placeholder="100"
              value={bulkAmount}
              onChange={(e) => setBulkAmount(e.target.value)}
              className="bg-card text-sm h-9"
              data-testid="input-bulk-amount"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-1 block">Reason</label>
            <Input
              placeholder="e.g. Weekly distribution, event bonus"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              className="bg-card text-sm h-9"
              data-testid="input-bulk-reason"
            />
          </div>
          <Button
            onClick={handleBulkGrant}
            disabled={bulkLoading}
            className="gap-1.5 h-9 shrink-0"
            data-testid="button-bulk-grant"
          >
            <Send className="w-3.5 h-3.5" />
            {bulkLoading ? "Granting..." : "Grant to All"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card"
          data-testid="input-search-users"
        />
      </div>

      {/* User table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">User</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Balance</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Bets</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Winnings</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((u) => (
                  <>
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10" data-testid={`user-row-${u.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              {u.displayName}
                              {u.role === "admin" && (
                                <Shield className="w-3 h-3 text-primary" />
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              @{u.username}{u.email ? ` · ${u.email}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-primary tabular-nums">{formatKC(u.balance)} KC</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{u.totalBets}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatKC(u.totalWinnings)} KC</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setAdjustUserId(adjustUserId === u.id ? null : u.id)}
                          data-testid={`button-adjust-${u.id}`}
                        >
                          <Coins className="w-3 h-3 mr-1" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                    {adjustUserId === u.id && (
                      <tr key={`adjust-${u.id}`}>
                        <td colSpan={5} className="px-4 py-3 bg-muted/10">
                          <div className="flex items-end gap-3">
                            <div className="w-28">
                              <label className="text-[10px] text-muted-foreground mb-1 block">Amount (+ or -)</label>
                              <Input
                                type="number"
                                placeholder="100"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(e.target.value)}
                                className="bg-card text-xs h-8"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-muted-foreground mb-1 block">Reason</label>
                              <Input
                                placeholder="e.g. Bonus, correction..."
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                                className="bg-card text-xs h-8"
                              />
                            </div>
                            <Button size="sm" className="h-8 text-xs" onClick={() => adjustBalance(u.id)}>
                              Apply
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAdjustUserId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {filtered?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}
