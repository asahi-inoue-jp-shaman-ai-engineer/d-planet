import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMeidiaList } from "@/hooks/use-meidia";
import { useCurrentUser } from "@/hooks/use-auth";
import { MeidiaCard } from "@/components/MeidiaCard";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Plus, Search, Globe, User } from "lucide-react";
import type { MeidiaResponse } from "@shared/routes";

type CategoryFilter = "all" | "island" | "report" | "other";
type TabType = "public" | "my";

const CATEGORY_SECTION_THRESHOLD = 6;

function MeidiaGrid({ items }: { items: MeidiaResponse[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((m) => <MeidiaCard key={m.id} meidia={m} showVisibility />)}
    </div>
  );
}

function MeidiaSection({ list, search }: { list: MeidiaResponse[]; search: string }) {
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = list.filter((m) => {
    if (category === "island" && m.meidiaType !== "activity") return false;
    if (category === "report" && m.meidiaType !== "report") return false;
    if (category === "other" && (m.meidiaType === "activity" || m.meidiaType === "report")) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.tags?.toLowerCase().includes(q) ||
      m.creator.username.toLowerCase().includes(q)
    );
  });

  const islandItems = filtered.filter(m => m.meidiaType === "activity");
  const reportItems = filtered.filter(m => m.meidiaType === "report");
  const otherItems = filtered.filter(m => m.meidiaType !== "activity" && m.meidiaType !== "report");

  const islandCount = list.filter(m => m.meidiaType === "activity").length;
  const reportCount = list.filter(m => m.meidiaType === "report").length;
  const otherCount = list.filter(m => m.meidiaType !== "activity" && m.meidiaType !== "report").length;

  const showCategories = list.length >= CATEGORY_SECTION_THRESHOLD;

  return (
    <div className="space-y-4">
      {showCategories && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant={category === "all" ? "default" : "outline"} size="sm" className="h-7 text-xs font-mono" onClick={() => setCategory("all")} data-testid="filter-all">
            ALL ({list.length})
          </Button>
          {islandCount > 0 && (
            <Button variant={category === "island" ? "default" : "outline"} size="sm" className="h-7 text-xs font-mono" onClick={() => setCategory("island")} data-testid="filter-island">
              ISLAND ({islandCount})
            </Button>
          )}
          {reportCount > 0 && (
            <Button variant={category === "report" ? "default" : "outline"} size="sm" className="h-7 text-xs font-mono" onClick={() => setCategory("report")} data-testid="filter-report">
              REPORT ({reportCount})
            </Button>
          )}
          {otherCount > 0 && (
            <Button variant={category === "other" ? "default" : "outline"} size="sm" className="h-7 text-xs font-mono" onClick={() => setCategory("other")} data-testid="filter-other">
              OTHER ({otherCount})
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="font-mono text-muted-foreground text-sm py-4">
          {search ? "検索結果が見つかりません" : "MEiDIAはまだありません"}
        </p>
      ) : category !== "all" ? (
        <MeidiaGrid items={filtered} />
      ) : showCategories ? (
        <div className="space-y-6">
          {islandItems.length > 0 && (
            <div>
              <h2 className="text-xs font-mono font-semibold text-muted-foreground mb-3 uppercase tracking-widest" data-testid="section-island-meidia">Island MEiDIA</h2>
              <MeidiaGrid items={islandItems} />
            </div>
          )}
          {reportItems.length > 0 && (
            <div>
              <h2 className="text-xs font-mono font-semibold text-muted-foreground mb-3 uppercase tracking-widest" data-testid="section-report-meidia">Report MEiDIA</h2>
              <MeidiaGrid items={reportItems} />
            </div>
          )}
          {otherItems.length > 0 && (
            <div>
              <h2 className="text-xs font-mono font-semibold text-muted-foreground mb-3 uppercase tracking-widest" data-testid="section-other-meidia">Other MEiDIA</h2>
              <MeidiaGrid items={otherItems} />
            </div>
          )}
        </div>
      ) : (
        <MeidiaGrid items={filtered} />
      )}
    </div>
  );
}

export default function MeidiaList() {
  const [tab, setTab] = useState<TabType>("public");
  const [search, setSearch] = useState("");
  const { data: currentUser } = useCurrentUser();

  const { data: publicList, isLoading: publicLoading } = useMeidiaList();
  const { data: myList, isLoading: myLoading } = useMeidiaList(currentUser?.id);

  const isLoading = tab === "public" ? publicLoading : myLoading;
  const list = tab === "public" ? (publicList ?? []) : (myList ?? []);

  return (
    <TerminalLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-mono font-bold" data-testid="text-meidia-title">MEiDIA</h1>
          <Link href="/meidia/create">
            <Button className="font-mono" size="sm" data-testid="button-create-meidia">
              <Plus className="w-4 h-4 mr-1" />
              NEW
            </Button>
          </Link>
        </div>

        <div className="flex gap-1 border-b border-border/50 pb-0">
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors ${tab === "public" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("public")}
            data-testid="tab-public"
          >
            <Globe className="w-3.5 h-3.5" />
            PUBLIC {publicList ? `(${publicList.length})` : ""}
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors ${tab === "my" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("my")}
            data-testid="tab-my"
          >
            <User className="w-3.5 h-3.5" />
            MY MEiDIA {myList ? `(${myList.length})` : ""}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="タイトル、タグ、作成者で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 font-mono"
            data-testid="input-search-meidia"
          />
        </div>

        {isLoading ? (
          <div className="font-mono text-muted-foreground text-sm">読み込み中...</div>
        ) : (
          <MeidiaSection list={list} search={search} />
        )}

        {tab === "my" && !isLoading && list.length === 0 && !search && (
          <div className="text-center py-8">
            <p className="font-mono text-muted-foreground mb-4 text-sm">まだMEiDIAを作成していません</p>
            <Link href="/meidia/create">
              <Button variant="outline" className="font-mono" data-testid="button-create-first-meidia">
                <Plus className="w-4 h-4 mr-2" />
                最初のMEiDIAを作成
              </Button>
            </Link>
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
