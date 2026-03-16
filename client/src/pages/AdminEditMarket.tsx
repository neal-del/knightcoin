import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useRoute, useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import type { Market } from "@shared/schema";

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

const EMOJIS = ["📊", "🏀", "⚾", "🏈", "⚽", "🎤", "📋", "⚛️", "🏛️", "📈", "🤖", "₿", "📱", "🇺🇸", "🎉", "🏆", "💻", "🎓", "🗳️", "🔬"];

export default function AdminEditMarket() {
  const { isAdmin } = useAuth();
  const [, params] = useRoute("/admin/markets/:id/edit");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: market, isLoading } = useQuery<Market>({
    queryKey: ["/api/markets", params?.id],
    enabled: !!params?.id && isAdmin,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("sports");
  const [subcategory, setSubcategory] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [icon, setIcon] = useState("📊");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (market) {
      setTitle(market.title);
      setDescription(market.description);
      setCategory(market.category);
      setSubcategory(market.subcategory || "");
      // Convert ISO to datetime-local format
      const d = new Date(market.closesAt);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setClosesAt(local);
      setIcon(market.icon || "📊");
      setFeatured(market.featured);
    }
  }, [market]);

  if (!isAdmin) return null;

  if (isLoading) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-[700px] mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-[700px] mx-auto text-center py-20">
        <p className="text-muted-foreground">Market not found.</p>
        <Link href="/admin/markets">
          <Button variant="outline" className="mt-4">Back to Markets</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !closesAt) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/admin/markets/${market.id}`, {
        title,
        description,
        category,
        subcategory: subcategory || null,
        closesAt: new Date(closesAt).toISOString(),
        icon,
        featured,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", market.id] });
      toast({ title: "Market updated" });
      setLocation("/admin/markets");
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-[700px] mx-auto space-y-6">
      <div>
        <Link href="/admin/markets">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Markets
          </span>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Edit Market</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Market Question</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card"
            data-testid="input-edit-title"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Resolution Criteria</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            data-testid="input-edit-description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="select-edit-category"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Subcategory (optional)</label>
            <Input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="bg-card"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Closes At</label>
            <Input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="bg-card"
              data-testid="input-edit-closes-at"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`w-8 h-8 rounded-md text-base flex items-center justify-center transition-colors ${
                    icon === e ? "bg-primary/20 border border-primary/40" : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm text-foreground">Feature this market on the homepage</span>
        </label>

        <Button type="submit" className="w-full gap-2" disabled={saving} data-testid="button-save-market">
          {saving ? "Saving..." : "Save Changes"}
          <Save className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
