import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { MarketRequest } from "@shared/schema";

const CATEGORIES = [
  { value: "sports", label: "School Sports", icon: "🏀" },
  { value: "academic", label: "Academic", icon: "📚" },
  { value: "social", label: "Social & Fun", icon: "🎉" },
  { value: "campus", label: "Campus & Policy", icon: "🏫" },
  { value: "politics", label: "Politics", icon: "🏛️" },
  { value: "pro-sports", label: "Pro Sports", icon: "🏆" },
  { value: "tech", label: "Tech & Business", icon: "💻" },
  { value: "crypto", label: "Crypto", icon: "₿" },
];

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-400", label: "Pending" },
  approved: { icon: CheckCircle2, color: "text-emerald-400", label: "Approved" },
  rejected: { icon: XCircle, color: "text-rose-400", label: "Rejected" },
};

export default function RequestMarket() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("sports");
  const [showName, setShowName] = useState(true);
  const [loading, setLoading] = useState(false);

  const { data: myRequests } = useQuery<MarketRequest[]>({
    queryKey: ["/api/market-requests/mine"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-[700px] mx-auto text-center py-20">
        <p className="text-muted-foreground">Sign in to request a market.</p>
        <Link href="/login">
          <Button variant="outline" className="mt-4">Sign In</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/market-requests", {
        title,
        description,
        category,
        showName,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/market-requests/mine"] });
      toast({ title: "Request submitted!", description: "An admin will review your market idea." });
      setTitle("");
      setDescription("");
    } catch (err: any) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-[700px] mx-auto space-y-6">
      <div>
        <Link href="/markets">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Markets
          </span>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Request a Market</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suggest a prediction market idea. Admins will review and may create it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Market Question</label>
          <Input
            placeholder="Will the school cafeteria add a salad bar by May?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card"
            data-testid="input-request-title"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Description / Resolution Criteria</label>
          <textarea
            placeholder="Describe what would make this resolve YES vs NO..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            data-testid="input-request-description"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="select-request-category"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <input
            type="checkbox"
            checked={showName}
            onChange={(e) => setShowName(e.target.checked)}
            className="rounded border-border bg-card text-primary focus:ring-primary/50 w-3.5 h-3.5 mt-0.5"
          />
          <div>
            <span className="text-xs font-medium text-foreground">Feature my name on this market</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              If approved, the market will show "Suggested by {user.displayName}" beneath the title.
            </p>
          </div>
        </label>

        <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-submit-request">
          {loading ? "Submitting..." : "Submit Request"}
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* My previous requests */}
      {myRequests && myRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Your Requests</h2>
          {myRequests.map((req) => {
            const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-card p-4"
                data-testid={`request-${req.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{req.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${status.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                {req.adminNote && (
                  <div className="mt-2 rounded-lg bg-muted/20 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Admin note:</span> {req.adminNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
