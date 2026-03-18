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
import type { Market, MarketOption } from "@shared/schema";

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
  const [yesPrice, setYesPrice] = useState("");
  const [noPrice, setNoPrice] = useState("");
  const [optionPrices, setOptionPrices] = useState<{ id: string; label: string; price: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const isMulti = market?.marketType === "multi_outcome" || market?.marketType === "time_bracket";

  const { data: options } = useQuery<MarketOption[]>({
    queryKey: ["/api/markets", params?.id, "options"],
    enabled: !!params?.id && isMulti,
  });

  useEffect(() => {
    if (market) {
      setTitle(market.title);
      setDescription(market.description);
      setCategory(market.category);
      setSubcategory(market.subcategory || "");
      const d = new Date(market.closesAt);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setClosesAt(local);
      setIcon(market.icon || "📊");
      setFeatured(market.featured);
      setYesPrice(String(market.yesPrice));
      setNoPrice(String(market.noPrice));
    }
  }, [market]);

  useEffect(() => {
    if (options) {
      setOptionPrices(options.map((o) => ({ id: o.id, label: o.label, price: String(o.price) })));
    }
  }, [options]);

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
      const body: any = {
        title,
        description,
        category,
        subcategory: subcategory || null,
        closesAt: new Date(closesAt).toISOString(),
        icon,
        featured,
      };

      // Include binary prices if not multi
      if (!isMulti) {
        body.yesPrice = parseFloat(yesPrice);
        body.noPrice = parseFloat(noPrice);
      }

      await apiRequest("PATCH", `/api/admin/markets/${market.id}`, body);

      // Update option prices for multi-option markets
      if (isMulti && optionPrices.length > 0) {
        await apiRequest("PATCH", `/api/admin/markets/${market.id}/options`, {
          options: optionPrices.map((o) => ({ id: o.id, price: parseFloat(o.price) })),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", market.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets", market.id, "options"] });
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

        {/* Prices */}
        {!isMulti ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">YES Price (0.01–0.99)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="0.99"
                value={yesPrice}
                onChange={(e) => {
                  setYesPrice(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setNoPrice((1 - v).toFixed(2));
                }}
                className="bg-card tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">NO Price (0.01–0.99)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="0.99"
                value={noPrice}
                onChange={(e) => {
                  setNoPrice(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setYesPrice((1 - v).toFixed(2));
                }}
                className="bg-card tabular-nums"
              />
            </div>
          </div>
        ) : optionPrices.length > 0 ? (
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground block">Option Prices (0.01–0.99)</label>
            {market?.exclusiveMulti === false && (
              <p className="text-[11px] text-amber-400">Non-exclusive market — prices are independent and don't need to sum to 1.</p>
            )}
            {optionPrices.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right tabular-nums shrink-0">{i + 1}</span>
                <span className="text-sm text-foreground flex-1 truncate">{opt.label}</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={opt.price}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    const next = [...optionPrices];
                    next[i] = { ...next[i], price: val };
                    setOptionPrices(next);
                  }}
                  className="bg-card w-24 tabular-nums text-center"
                />
              </div>
            ))}
            {market?.exclusiveMulti !== false && (
              (() => {
                const sum = optionPrices.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
                const isValid = Math.abs(sum - 1) <= 0.05;
                return (
                  <p className={`text-[11px] ${isValid ? "text-emerald-400" : "text-rose-400"}`}>
                    Price total: {sum.toFixed(2)} {isValid ? "\u2713" : "(should be ~1.00 for exclusive markets)"}
                  </p>
                );
              })()
            )}
          </div>
        ) : null}

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
