import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMeidiaList } from "@/hooks/use-meidia";
import { MeidiaCard } from "@/components/MeidiaCard";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Plus, Search, Globe, Lock } from "lucide-react";

type CategoryFilter = "all" | "island" | "report" | "other";

export default function MeidiaList() {
  const { data: meidiaList, isLoading } = useMeidiaList();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = meidiaList?.filter((m) => {
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

  const islandCount = meidiaList?.filter(m => m.meidiaType === "activity").length || 0;
  const reportCount = meidiaList?.filter(m => m.meidiaType === "report").length || 0;
  const otherCount = meidiaList?.filter(m => m.meidiaType !== "activity" && m.meidiaType !== "report").length || 0;

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

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant={category === "all" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setCategory("all")} data-testid="filter-all">
            ALL ({meidiaList?.length || 0})
          </Button>
          <Button variant={category === "island" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setCategory("island")} data-testid="filter-island">
            ISLAND ({islandCount})
          </Button>
          <Button variant={category === "report" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setCategory("report")} data-testid="filter-report">
            REPORT ({reportCount})
          </Button>
          {otherCount > 0 && (
            <Button variant={category === "other" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setCategory("other")} data-testid="filter-other">
              OTHER ({otherCount})
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="font-mono text-muted-foreground">読み込み中...</div>
        ) : filtered && filtered.length > 0 ? (
          <>
            {category === "all" && islandCount > 0 && reportCount > 0 ? (
              <div className="space-y-6">
                {islandCount > 0 && (
                  <div>
                    <h2 className="text-sm font-mono font-semibold text-muted-foreground mb-3" data-testid="section-island-meidia">ISLAND MEiDIA</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filtered.filter(m => m.meidiaType === "activity").map((meidia) => (
                        <MeidiaCard key={meidia.id} meidia={meidia} showVisibility />
                      ))}
                    </div>
                  </div>
                )}
                {reportCount > 0 && (
                  <div>
                    <h2 className="text-sm font-mono font-semibold text-muted-foreground mb-3" data-testid="section-report-meidia">REPORT MEiDIA</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filtered.filter(m => m.meidiaType === "report").map((meidia) => (
                        <MeidiaCard key={meidia.id} meidia={meidia} showVisibility />
                      ))}
                    </div>
                  </div>
                )}
                {filtered.filter(m => m.meidiaType !== "activity" && m.meidiaType !== "report").length > 0 && (
                  <div>
                    <h2 className="text-sm font-mono font-semibold text-muted-foreground mb-3" data-testid="section-other-meidia">OTHER MEiDIA</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filtered.filter(m => m.meidiaType !== "activity" && m.meidiaType !== "report").map((meidia) => (
                        <MeidiaCard key={meidia.id} meidia={meidia} showVisibility />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((meidia) => (
                  <MeidiaCard key={meidia.id} meidia={meidia} showVisibility />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="font-mono text-muted-foreground mb-4">
              {search ? "検索結果が見つかりません" : "MEiDIAはまだありません"}
            </p>
            {!search && (
              <Link href="/meidia/create">
                <Button variant="outline" className="font-mono" data-testid="button-create-first-meidia">
                  <Plus className="w-4 h-4 mr-2" />
                  最初のMEiDIAを作成
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
