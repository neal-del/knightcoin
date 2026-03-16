import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { CATEGORY_LABELS } from "@/components/MarketCard";
import type { MarketRequest } from "@shared/schema";

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: "text-yellow-400 border-yellow-500/20 bg-yellow-500/10", label: "Pending" },
  approved: { color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10", label: "Approved" },
  rejected: { color: "text-rose-400 border-rose-500/20 bg-rose-500/10", label: "Rejected" },
};

export default function AdminRequests() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const { data: requests, isLoading } = useQuery<MarketRequest[]>({
    queryKey: ["/api/admin/market-requests"],
    enabled: isAdmin,
  });

  const filtered = requests?.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const handleApprove = async (id: string) => {
    try {
      await apiRequest("POST", `/api/admin/market-requests/${id}/approve`, {
        adminNote: noteMap[id] || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/market-requests"] });
      toast({ title: "Request approved" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiRequest("POST", `/api/admin/market-requests/${id}/reject`, {
        adminNote: noteMap[id] || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/market-requests"] });
      toast({ title: "Request rejected" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
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
        <h1 className="text-xl font-bold text-foreground">Market Requests</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
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
            {requests && (
              <span className="ml-1.5 tabular-nums">
                ({f === "all" ? requests.length : requests.filter((r) => r.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((req) => {
            const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
                data-testid={`admin-request-${req.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{req.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span>{CATEGORY_LABELS[req.category] || req.category}</span>
                      <span>User: {req.userId.slice(0, 8)}…</span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${status.color}`}>
                    {status.label}
                  </Badge>
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <MessageSquare className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        placeholder="Admin note (optional)"
                        value={noteMap[req.id] || ""}
                        onChange={(e) => setNoteMap((m) => ({ ...m, [req.id]: e.target.value }))}
                        className="w-full rounded-md border border-border bg-muted/30 pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        data-testid={`input-admin-note-${req.id}`}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="gap-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprove(req.id)}
                      data-testid={`button-approve-${req.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs h-8 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                      onClick={() => handleReject(req.id)}
                      data-testid={`button-reject-${req.id}`}
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </Button>
                  </div>
                )}

                {req.adminNote && req.status !== "pending" && (
                  <div className="rounded-lg bg-muted/20 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Admin note:</span> {req.adminNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {filtered?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No {filter === "all" ? "" : filter} requests found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
