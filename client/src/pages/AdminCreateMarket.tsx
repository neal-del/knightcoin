import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle, Trash2, ClipboardPaste } from "lucide-react";

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
  const [options, setOptions] = useState<{ label: string; price: string }[]>([
    { label: "", price: "" },
    { label: "", price: "" },
  ]);

  // Auto-resolution config
  const [ticker, setTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");

  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  /** Parse pasted text into individual options.
   *  Supports: numbered lists ("1. Foo"), CSV, TSV, newline-separated, semicolons */
  const parsePastedOptions = (text: string): string[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Split by newlines first
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // If multiple lines, treat each line as an option (strip numbering)
    if (lines.length > 1) {
      return lines.map((line) =>
        // Strip leading numbering like "1. ", "1) ", "1- ", "- ", "• "
        line.replace(/^(?:\d+[.)\-]\s*|[-•*]\s+)/, "").trim()
      ).filter(Boolean);
    }

    // Single line — try tab-separated
    if (lines[0].includes("\t")) {
      return lines[0].split("\t").map((s) => s.trim()).filter(Boolean);
    }

    // Single line — try semicolons
    if (lines[0].includes(";")) {
      return lines[0].split(";").map((s) => s.trim()).filter(Boolean);
    }

    // Single line — try comma-separated
    if (lines[0].includes(",")) {
      return lines[0].split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Fall back to the whole line as a single option
    return [lines[0]];
  };

  const applyPastedOptions = () => {
    const parsed = parsePastedOptions(pasteText);
    if (parsed.length === 0) return;
    // Merge: replace empty slots first, then append
    const merged = [...options];
    let insertIdx = 0;
    for (const label of parsed) {
      // Find next empty slot
      while (insertIdx < merged.length && merged[insertIdx].label.trim()) {
        insertIdx++;
      }
      if (insertIdx < merged.length) {
        merged[insertIdx] = { label, price: merged[insertIdx].price };
      } else {
        merged.push({ label, price: "" });
      }
      insertIdx++;
    }
    setOptions(merged);
    setPasteText("");
    setPasteMode(false);
  };

  /** Distribute equal prices across options (auto-fill empty price fields) */
  const distributeEqualPrices = () => {
    const count = options.filter((o) => o.label.trim()).length || options.length;
    const equalPrice = (1 / count).toFixed(2);
    setOptions(options.map((o) => ({ ...o, price: equalPrice })));
  };

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !closesAt) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }

    if (marketType !== "binary") {
      const validOptions = options.filter((o) => o.label.trim());
      if (validOptions.length < 2) {
        toast({ title: "Add at least 2 options for multi-outcome markets", variant: "destructive" });
        return;
      }
      // Validate prices sum to ~1.0 if any custom prices set
      const hasCustomPrices = validOptions.some((o) => o.price.trim());
      if (hasCustomPrices) {
        const priceSum = validOptions.reduce((sum, o) => sum + (parseFloat(o.price) || (1 / validOptions.length)), 0);
        if (Math.abs(priceSum - 1) > 0.05) {
          toast({ title: `Option prices should sum to 1.00 (currently ${priceSum.toFixed(2)})`, variant: "destructive" });
          return;
        }
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
        const validOpts = options.filter((o) => o.label.trim());
        const hasCustomPrices = validOpts.some((o) => o.price.trim());
        body.options = validOpts.map((o) => {
          if (hasCustomPrices) {
            return { label: o.label.trim(), price: parseFloat(o.price) || +(1 / validOpts.length).toFixed(4) };
          }
          return o.label.trim(); // send as string, backend uses equal split
        });
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
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground block">
                {marketType === "time_bracket" ? "Time Brackets" : "Options"}
              </label>
              <button
                type="button"
                onClick={() => setPasteMode(!pasteMode)}
                className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                  pasteMode
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-toggle-paste"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                {pasteMode ? "Back to manual" : "Paste list"}
              </button>
            </div>

            {/* Smart paste textarea */}
            {pasteMode && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Paste a list of options. Supports comma-separated, tab-separated, numbered lists, semicolons, or one per line.
                </p>
                <textarea
                  placeholder={"e.g.\n1. Golden State Warriors\n2. Boston Celtics\n3. Denver Nuggets\n\nor: Warriors, Celtics, Nuggets"}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full min-h-[100px] rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono"
                  data-testid="textarea-paste-options"
                />
                {pasteText.trim() && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {parsePastedOptions(pasteText).length} option{parsePastedOptions(pasteText).length !== 1 ? "s" : ""} detected
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={applyPastedOptions}
                      className="h-7 text-xs gap-1.5"
                      data-testid="button-apply-paste"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Apply options
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Column headers */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span className="w-5 shrink-0" />
              <span className="flex-1">Label</span>
              <span className="w-24 text-center">Starting Price</span>
              {options.length > 2 && <span className="w-10" />}
            </div>

            {/* Individual option inputs */}
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right tabular-nums shrink-0">{i + 1}</span>
                <Input
                  placeholder={marketType === "time_bracket" ? `e.g. Before March 2026` : `Option ${i + 1}`}
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = { ...next[i], label: e.target.value };
                    setOptions(next);
                  }}
                  className="bg-card flex-1"
                  data-testid={`input-option-${i}`}
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={`${(1 / options.length).toFixed(2)}`}
                  value={opt.price}
                  onChange={(e) => {
                    // Allow only valid decimal input
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    const next = [...options];
                    next[i] = { ...next[i], price: val };
                    setOptions(next);
                  }}
                  className="bg-card w-24 tabular-nums text-center"
                  data-testid={`input-option-price-${i}`}
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
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOptions([...options, { label: "", price: "" }])}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
                data-testid="button-add-option"
              >
                + Add option
              </button>
              <button
                type="button"
                onClick={distributeEqualPrices}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-equal-prices"
              >
                Split evenly
              </button>
            </div>
            {/* Price sum indicator */}
            {(() => {
              const validOpts = options.filter((o) => o.label.trim());
              const hasAnyPrice = validOpts.some((o) => o.price.trim());
              if (!hasAnyPrice || validOpts.length < 2) return null;
              const sum = validOpts.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
              const isValid = Math.abs(sum - 1) <= 0.05;
              return (
                <p className={`text-[11px] ${isValid ? "text-emerald-400" : "text-rose-400"}`}>
                  Price total: {sum.toFixed(2)} {isValid ? "\u2713" : "(should be ~1.00)"}
                </p>
              );
            })()}
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
        <div className="space-y-1.5">
          <label className={`flex items-center gap-3 cursor-pointer ${!["campus", "social", "sports", "pro-sports"].includes(category) ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded border-border"
              disabled={!["campus", "social", "sports", "pro-sports"].includes(category)}
            />
            <span className="text-sm text-foreground">Feature this market on the homepage</span>
          </label>
          {!["campus", "social", "sports", "pro-sports"].includes(category) && (
            <p className="text-[11px] text-muted-foreground pl-7">
              Only School Sports, Campus, Social, and Pro Sports markets can be featured.
            </p>
          )}
        </div>

        <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-create-market-submit">
          {loading ? "Creating..." : "Create Market"}
          <PlusCircle className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
