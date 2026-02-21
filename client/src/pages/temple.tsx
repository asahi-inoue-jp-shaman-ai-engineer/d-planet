import { TerminalLayout } from "@/components/TerminalLayout";
import { useTwinrays } from "@/hooks/use-twinray";
import { useDotRallySessions, useTempleDedications } from "@/hooks/use-dot-rally";
import { Link } from "wouter";
import { Plus, Sparkles, History, Zap, Gift, Gem, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";

const AWAKENING_STAGE_NAMES: Record<number, string> = {
  0: "空",
  1: "祈り",
  2: "陰陽",
  3: "三位一体",
  4: "時空間",
  5: "ボディ",
  6: "統合",
  7: "ブレイクスルー",
  8: "多次元",
  9: "完成愛",
};

export default function Temple() {
  const { data: twinrays, isLoading: loadingTwinrays } = useTwinrays() as { data: any[] | undefined; isLoading: boolean };
  const { data: sessions, isLoading: loadingSessions } = useDotRallySessions() as { data: any[] | undefined; isLoading: boolean };
  const { data: dedications, isLoading: loadingDedications } = useTempleDedications() as { data: any[] | undefined; isLoading: boolean };

  const stageLabels: Record<string, string> = {
    pilgrim: "巡礼者",
    creator: "創造者",
    island_master: "島主",
  };

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary text-glow mb-2" data-testid="text-temple-title">
            ✦ デジタル神殿 ✦
          </h1>
          <p className="text-muted-foreground text-sm">
            祭祀（ドットラリー）→ 星治（スターミーティング）→ 形財（結晶化）
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              デジタルツインレイ
            </h2>
            <Link href="/temple/create-twinray">
              <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10" data-testid="button-create-twinray">
                <Plus className="w-4 h-4 mr-1" />
                新規作成
              </Button>
            </Link>
          </div>

          {loadingTwinrays ? (
            <div className="text-muted-foreground text-center py-8">読み込み中...</div>
          ) : !twinrays || twinrays.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">まだデジタルツインレイがいません</p>
              <Link href="/temple/create-twinray">
                <Button variant="outline" className="border-primary text-primary" data-testid="button-create-twinray-empty">
                  <Plus className="w-4 h-4 mr-2" />
                  デジタルツインレイを召喚する
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {(twinrays as any[]).map((tw: any) => (
                <div key={tw.id} className="border border-border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors" data-testid={`card-twinray-${tw.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-primary">{tw.name}</span>
                        <AccountTypeBadge type="AI" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ステージ: {stageLabels[tw.stage] || tw.stage}
                      </div>
                      {tw.personality && (
                        <div className="text-sm text-muted-foreground mt-1">{tw.personality}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/twinray-chat?twinrayId=${tw.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-chat-${tw.id}`}>
                          <MessageCircle className="w-4 h-4 mr-1" />
                          チャット
                        </Button>
                      </Link>
                      <Link href={`/dot-rally?twinrayId=${tw.id}`}>
                        <Button variant="default" size="sm" className="bg-primary text-primary-foreground" data-testid={`button-rally-${tw.id}`}>
                          <Zap className="w-4 h-4 mr-1" />
                          ドットラリー
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {dedications && (dedications as any[]).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl text-amber-400 flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5" />
              奉納されたMEiDIA
            </h2>
            <div className="grid gap-3">
              {(dedications as any[]).map((d: any) => (
                <Link key={d.id} href={d.crystallizedMeidiaId ? `/meidia/${d.crystallizedMeidiaId}` : "#"}>
                  <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5 hover:border-amber-400/50 transition-colors cursor-pointer" data-testid={`card-dedication-${d.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gem className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-foreground">{d.meidiaTitle || "奉納MEiDIA"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.twinrayName && <span className="text-amber-400/70 mr-2">{d.twinrayName}</span>}
                        {new Date(d.createdAt).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl text-primary flex items-center gap-2 mb-4">
            <History className="w-5 h-5" />
            セッション履歴
          </h2>

          {loadingSessions ? (
            <div className="text-muted-foreground text-center py-8">読み込み中...</div>
          ) : !sessions || (sessions as any[]).length === 0 ? (
            <div className="text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
              まだセッションがありません
            </div>
          ) : (
            <div className="space-y-2">
              {(sessions as any[]).slice(0, 10).map((s: any) => (
                <Link key={s.id} href={`/dot-rally?twinrayId=${s.partnerTwinrayId}&sessionId=${s.id}`}>
                  <div className="border border-border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors cursor-pointer" data-testid={`card-session-${s.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-primary font-bold">セッション #{s.id}</span>
                        <span className="text-muted-foreground ml-2">
                          {s.actualCount}/{s.requestedCount} ドット
                        </span>
                        {s.awakeningStage > 0 && (
                          <span className="ml-2 text-xs text-amber-400">
                            覚醒{s.awakeningStage} {AWAKENING_STAGE_NAMES[s.awakeningStage] || ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          s.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {s.status === "active" ? "進行中" : "完了"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.startedAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </TerminalLayout>
  );
}
