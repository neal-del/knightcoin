import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import MarketCard from "@/components/MarketCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Market } from "@shared/schema";

const TABS = [
  { key: "all", label: "All Markets" },
  { key: "school", label: "🏫 School" },
  { key: "macro", label: "🌍 Macro" },
  { key: "sports", label: "🏀 Sports" },
  { key: "academic", label: "📚 Academic" },
  { key: "social", label: "🎉 Social" },
  { key: "campus", label: "📋 Campus" },
  { key: "politics", label: "🏛️ Politics" },
  { key: "tech", label: "💻 Tech" },
  { key: "crypto", label: "₿ Crypto" },
];

const SCHOOL_CATS = ["sports", "academic", "social", "campus", "admin"];
const MACRO_CATS = ["politics", "pro-sports", "tech", "crypto"];

export default function Markets() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const { data: markets, isLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const filtered = markets?.filter((m) => {
    // Hide resolved markets
    if (m.resolved) return false;

    // Tab filter
    if (activeTab === "school" && !SCHOOL_CATS.includes(m.category)) return false;
    if (activeTab === "macro" && !MACRO_CATS.includes(m.category)) return false;
    if (activeTab === "sports" && m.category !== "sports" && m.category !== "pro-sports") return false;
    if (activeTab === "academic" && m.category !== "academic") return false;
    if (activeTab === "social" && m.category !== "social") return false;
    if (activeTab === "campus" && m.category !== "campus" && m.category !== "admin") return false;
    if (activeTab === "politics" && m.category !== "politics") return false;
    if (activeTab === "tech" && m.category !== "tech") return false;
    if (activeTab === "crypto" && m.category !== "crypto") return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.subcategory && m.subcategory.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground mb-1">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Browse and trade on school events, sports, politics, tech, and more.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card"
          data-testid="input-search"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" data-testid="market-tabs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            data-testid={`tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Market grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => <MarketCard key={m.id} market={m} />)}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No markets found.</p>
        </div>
      )}
    </div>
  );
}
