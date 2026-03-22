import { useQuery, useMutation } from "@tanstack/react-query";
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
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Mail,
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

interface TerminatedEmail {
  email: string;
  deletedBy: string;
  deletedAt: string;
}

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "terminated">("users");

  // Bulk grant
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: terminatedEmails, isLoading: terminatedLoading } = useQuery<TerminatedEmail[]>({
    queryKey: ["/api/admin/terminated-emails"],
    enabled: isAdmin && tab === "terminated",
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/delete`);
    },
    onSuccess: (_data, userId) => {
      const user = users?.find(u => u.id === userId);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/terminated-emails"] });
      toast({ title: `Account deleted${user?.email ? `: ${user.email}` : ""}` });
      setDeleteConfirm(null);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to delete",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const reallowMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", `/api/admin/terminated-emails/${encodeURIComponent(email)}/allow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/terminated-emails"] });
      toast({ title: "Email re-allowed for registration" });
    },
    onError: () => {
      toast({ title: "Failed to re-allow email", variant: "destructive" });
    },
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

  const userCount = users?.filter(u => u.role !== "admin").length ?? 0;
  const adminCount = users?.filter(u => u.role === "admin").length ?? 0;

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
        <p className="text-xs text-muted-foreground mt-1">
          {userCount} student{userCount !== 1 ? "s" : ""} · {adminCount} admin{adminCount !== 1 ? "s" : ""}
          {terminatedEmails && terminatedEmails.length > 0 && (
            <> · <span className="text-rose-400">{terminatedEmails.length} terminated</span></>
          )}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border w-fit">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === "users"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-users"
        >
          <Users className="w-3 h-3 inline mr-1.5" />
          Active Users
        </button>
        <button
          onClick={() => setTab("terminated")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === "terminated"
              ? "bg-rose-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-terminated"
        >
          <Ban className="w-3 h-3 inline mr-1.5" />
          Terminated
        </button>
      </div>

      {tab === "users" ? (
        <>
          {/* Bulk grant */}
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Bulk KC Distribution
            </h3>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[120px] max-w-[150px]">
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
              <div className="flex-1 min-w-[200px]">
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
                      <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 hidden md:table-cell">Email</th>
                      <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Balance</th>
                      <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 hidden sm:table-cell">Bets</th>
                      <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 hidden sm:table-cell">Winnings</th>
                      <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered?.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        adjustUserId={adjustUserId}
                        setAdjustUserId={setAdjustUserId}
                        adjustAmount={adjustAmount}
                        setAdjustAmount={setAdjustAmount}
                        adjustReason={adjustReason}
                        setAdjustReason={setAdjustReason}
                        adjustBalance={adjustBalance}
                        deleteConfirm={deleteConfirm}
                        setDeleteConfirm={setDeleteConfirm}
                        deleteMutation={deleteMutation}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No users found.</div>
              )}
            </div>
          )}
        </>
      ) : (
        /* ═══════════════ Terminated Emails Tab ═══════════════ */
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Terminated Accounts</h3>
                <p className="text-xs text-muted-foreground">
                  These emails belong to deleted accounts. They cannot re-register unless you remove them
                  from this list. When a terminated email attempts to register, an automatic email is sent
                  to neal@rgoel.com for approval.
                </p>
              </div>
            </div>
          </div>

          {terminatedLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : terminatedEmails && terminatedEmails.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Email</th>
                      <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 hidden sm:table-cell">Deleted</th>
                      <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminatedEmails.map((t) => (
                      <tr key={t.email} className="border-b border-border/50 hover:bg-muted/10" data-testid={`terminated-row-${t.email}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                              <Mail className="w-3.5 h-3.5 text-rose-400" />
                            </div>
                            <span className="font-medium text-foreground">{t.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {new Date(t.deletedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => reallowMutation.mutate(t.email)}
                            disabled={reallowMutation.isPending}
                            data-testid={`button-reallow-${t.email}`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Re-allow
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Ban className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No terminated accounts.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ User Row Component ═══════════════ */

function UserRow({
  user: u,
  adjustUserId,
  setAdjustUserId,
  adjustAmount,
  setAdjustAmount,
  adjustReason,
  setAdjustReason,
  adjustBalance,
  deleteConfirm,
  setDeleteConfirm,
  deleteMutation,
}: {
  user: AdminUser;
  adjustUserId: string | null;
  setAdjustUserId: (id: string | null) => void;
  adjustAmount: string;
  setAdjustAmount: (v: string) => void;
  adjustReason: string;
  setAdjustReason: (v: string) => void;
  adjustBalance: (id: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  deleteMutation: any;
}) {
  const isAdmin = u.role === "admin";
  const isDeleteTarget = deleteConfirm === u.id;

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/10" data-testid={`user-row-${u.id}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {u.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-foreground flex items-center gap-1.5">
                {u.displayName}
                {isAdmin && (
                  <Shield className="w-3 h-3 text-primary" />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                @{u.username}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-xs text-muted-foreground">{u.email || "—"}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-bold text-primary tabular-nums">{formatKC(u.balance)} KC</span>
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{u.totalBets}</td>
        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{formatKC(u.totalWinnings)} KC</td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
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
            {!isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                onClick={() => setDeleteConfirm(isDeleteTarget ? null : u.id)}
                data-testid={`button-delete-${u.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Delete confirmation */}
      {isDeleteTarget && (
        <tr key={`delete-${u.id}`}>
          <td colSpan={6} className="px-4 py-3 bg-rose-500/5 border-b border-rose-500/20">
            <div className="flex items-center gap-3 flex-wrap">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-300 flex-1">
                Delete <strong>{u.displayName}</strong>'s account ({u.email})? Their email will be
                blocked from re-registering without your approval.
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                  onClick={() => deleteMutation.mutate(u.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-confirm-delete-${u.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                  {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Adjust balance */}
      {adjustUserId === u.id && (
        <tr key={`adjust-${u.id}`}>
          <td colSpan={6} className="px-4 py-3 bg-muted/10">
            <div className="flex items-end gap-3 flex-wrap">
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
              <div className="flex-1 min-w-[150px]">
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
  );
}
