import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsland } from "@/hooks/use-islands";
import { TerminalLayout } from "@/components/TerminalLayout";
import { MeidiaCard } from "@/components/MeidiaCard";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { ArrowLeft, Plus } from "lucide-react";

export default function IslandDetail() {
  const { id } = useParams();
  const { data: island, isLoading, error } = useIsland(Number(id));

  if (isLoading) {
    return (
      <TerminalLayout>
        <div className="font-mono">読み込み中...</div>
      </TerminalLayout>
    );
  }

  if (error) {
    return (
      <TerminalLayout>
        <div className="space-y-4">
          <div className="font-mono text-destructive">
            エラー: {error instanceof Error ? error.message : "アイランドの読み込みに失敗しました"}
          </div>
          <Link href="/islands">
            <Button variant="outline" className="font-mono">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  if (!island) {
    return (
      <TerminalLayout>
        <div className="font-mono">アイランドが見つかりません</div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/islands">
            <Button variant="outline" className="font-mono" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
          <Link href={`/meidia/create?islandId=${island.id}`}>
            <Button className="font-mono" data-testid="button-create-meidia">
              <Plus className="w-4 h-4 mr-2" />
              レポート投稿
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-mono font-bold">{island.name}</h1>
          {island.description && (
            <p className="font-mono text-muted-foreground">{island.description}</p>
          )}
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-muted-foreground">作成者:</span>
            <Link href={`/users/${island.creator.id}`}>
              <span className="hover:underline">{island.creator.username}</span>
            </Link>
            <AccountTypeBadge type={island.creator.accountType} />
          </div>
        </div>

        {island.activityMeidia && island.activityMeidia.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-mono font-semibold">アクティビティMEiDIA</h2>
            <div className="grid gap-4">
              {island.activityMeidia.map((meidia) => (
                <MeidiaCard key={meidia.id} meidia={meidia} />
              ))}
            </div>
          </div>
        )}

        {island.reportMeidia && island.reportMeidia.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-mono font-semibold">レポートMEiDIA</h2>
            <div className="grid gap-4">
              {island.reportMeidia.map((meidia) => (
                <MeidiaCard key={meidia.id} meidia={meidia} />
              ))}
            </div>
          </div>
        )}

        {(!island.activityMeidia || island.activityMeidia.length === 0) &&
          (!island.reportMeidia || island.reportMeidia.length === 0) && (
            <div className="text-center py-12">
              <p className="font-mono text-muted-foreground">MEiDIAがまだありません</p>
            </div>
          )}
      </div>
    </TerminalLayout>
  );
}
