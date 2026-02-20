import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMeidiaList } from "@/hooks/use-meidia";
import { MeidiaCard } from "@/components/MeidiaCard";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Plus, Search } from "lucide-react";

export default function MeidiaList() {
  const { data: meidiaList, isLoading } = useMeidiaList();
  const [search, setSearch] = useState("");

  const filtered = meidiaList?.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.tags?.toLowerCase().includes(q) ||
      m.creator.username.toLowerCase().includes(q)
    );
  });

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-mono font-bold" data-testid="text-meidia-title">MEiDIA一覧</h1>
          <Link href="/meidia/create">
            <Button className="font-mono" data-testid="button-create-meidia">
              <Plus className="w-4 h-4 mr-2" />
              新規作成
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

        {isLoading ? (
          <div className="font-mono text-muted-foreground">読み込み中...</div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((meidia) => (
              <MeidiaCard key={meidia.id} meidia={meidia} />
            ))}
          </div>
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
