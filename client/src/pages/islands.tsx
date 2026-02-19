import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useIslands } from "@/hooks/use-islands";
import { IslandCard } from "@/components/IslandCard";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Plus } from "lucide-react";

export default function Islands() {
  const { data: islands, isLoading } = useIslands();

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-mono font-bold">アイランド一覧</h1>
          <Link href="/islands/create">
            <Button className="font-mono" data-testid="button-create-island">
              <Plus className="w-4 h-4 mr-2" />
              新規作成
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="font-mono text-muted-foreground">読み込み中...</div>
        ) : islands && islands.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {islands.map((island) => (
              <IslandCard key={island.id} island={island} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="font-mono text-muted-foreground">アイランドがありません</p>
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
