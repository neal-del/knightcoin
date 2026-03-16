import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle, Trash2 } from "lucide-react";

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

const RESOLUTION_SOURCES = [
  { value: "manual", label: "Manual (you decide)" },
  { value: "api_stock", label: "Auto — Stock Price" },
  { value: "api_crypto", label: "Auto — Crypto Price" },
  { value: "api_sports", label: "Auto — Sports Result" },
  { value: "api_news", label: "Auto — News/Event" },
];

const EMOJIS = ["📊", "🏀", "⚾", "🏈", "⚽", "🎤", "📋", "⚛️", "🏛️", "📈", "🤖", "₿", "📱", "🇺🇸", "🎉", "🏆", "💻", "🎓", "🗳️", "🔬"];

export default function AdminCreateMarket() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("sports");
  const [subcategory, setSubcategory] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [icon, setIcon] = useState("📊");
  const [featured, setFeatured] = useState(false);
  const [resolutionSource, setResolutionSource] = useState("manual");
  const [yesPrice, setYesPrice] = useState("0.5");
  const [noPrice, setNoPrice] = useState("0.5");
  const [loading, setLoading] = useState(false);
  const [marketType, setMarketType] = useState("binary");
  const [options, setOptions] = useState<string[]>(["", ""]);

  // Auto-resolution config
  const [ticker, setTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !closesAt) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }

    if (marketType !== "binary") {
      const validOptions = options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        toast({ title: "Add at least 2 options for multi-outcome markets", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      let resolutionData: any = null;
      if (resolutionSource === "api_stock") {
        resolutionData = { ticker, targetPrice: parseFloat(targetPrice), condition };
      } else if (resolutionSource === "api_crypto") {
        resolutionData = { symbol: ticker, targetPrice: parseFloat(targetPrice), condition };
      } else if (resolutionSource === "api_sports") {
        resolutionData = { topic: ticker };
      } else if (resolutionSource === "api_news") {
        resolutionData = { topic: ticker };
      }

      const body: any = {
        title,
        description,
        category,
        subcategory: subcategory || null,
        closesAt: new Date(closesAt).toISOString(),
        icon,
        featured,
        resolutionSource,
        resolutionData,
        marketType,
        yesPrice: parseFloat(yesPrice),
        noPrice: parseFloat(noPrice),
      };

      if (marketType !== "binary") {
        body.options = options.filter((o) => o.trim());
      }

      await apiRequest("POST", "/api/admin/markets", body);

      queryClient.invalidateQueries({ queryKey: ["/api/admin/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Market created" });
      setLocation("/admin/markets");
    } catch (err: any) {
      toast({ title: "Failed to create market", variant: "destructive" });
    } finally {
      setLoading(false);
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
        <h1 className="text-xl font-bold text-foreground">Create New Market</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Market Question</label>
          <Input
            placeholder="Will Menlo beat Sacred Heart in basketball?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card"
            data-testid="input-market-title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Resolution Criteria</label>
          <textarea
            placeholder="Describe exactly how this market resolves YES or NO..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            data-testid="input-market-description"
          />
        </div>

        {/* Market Type */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Market Type</label>
          <select
            value={marketType}
            onChange={(e) => setMarketType(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="select-market-type"
          >
            <option value="binary">Binary (Yes/No)</option>
            <option value="multi_outcome">Multi-Outcome</option>
            <option value="time_bracket">Time Bracket</option>
          </select>
        </div>

        {/* Options for non-binary markets */}
        {marketType !== "binary" && (
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground block">
              {marketType === "time_bracket" ? "Time Brackets" : "Options"}
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={marketType === "time_bracket" ? `e.g. Before March 2026` : `Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  className="bg-card flex-1"
                  data-testid={`input-option-${i}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="p-2 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    data-testid={`button-remove-option-${i}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
              data-testid="button-add-option"
            >
              + Add option
            </button>
          </div>
        )}

        {/* Category + Subcategory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="select-category"
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
              placeholder="e.g. Basketball, AP Exams"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="bg-card"
            />
          </div>
        </div>

        {/* Closes At + Icon */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Closes At</label>
            <Input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="bg-card"
              data-testid="input-closes-at"
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

        {/* Initial prices — binary only */}
        {marketType === "binary" && <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Initial YES Price (0-1)</label>
            <Input
              type="number"
              step="0.01"
              min="0.05"
              max="0.95"
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
            <label className="text-xs text-muted-foreground mb-1.5 block">Initial NO Price (0-1)</label>
            <Input
              type="number"
              step="0.01"
              min="0.05"
              max="0.95"
              value={noPrice}
              onChange={(e) => {
                setNoPrice(e.target.value);
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) setYesPrice((1 - v).toFixed(2));
              }}
              className="bg-card tabular-nums"
            />
          </div>
        </div>}

        {/* Resolution source */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Resolution Method</label>
          <select
            value={resolutionSource}
            onChange={(e) => setResolutionSource(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="select-resolution"
          >
            {RESOLUTION_SOURCES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Auto-resolution config */}
        {resolutionSource !== "manual" && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
            <p className="text-xs text-yellow-400 font-medium">Auto-Resolution Configuration</p>
            {(resolutionSource === "api_stock" || resolutionSource === "api_crypto") && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">
                      {resolutionSource === "api_stock" ? "Ticker" : "Symbol"}
                    </label>
                    <Input
                      placeholder={resolutionSource === "api_stock" ? "TSLA" : "BTC"}
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      className="bg-card text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Target Price</label>
                    <Input
                      type="number"
                      placeholder="300"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="bg-card text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-2 py-2 text-xs text-foreground"
                    >
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            {(resolutionSource === "api_sports" || resolutionSource === "api_news") && (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Topic / Event Key</label>
                <Input
                  placeholder="e.g. warriors_nba_playoffs_2026"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="bg-card text-xs"
                />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Auto-resolution checks run at market close time. You can always override with manual resolution.
            </p>
          </div>
        )}

        {/* Featured toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm text-foreground">Feature this market on the homepage</span>
        </label>

        <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-create-market-submit">
          {loading ? "Creating..." : "Create Market"}
          <PlusCircle className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
