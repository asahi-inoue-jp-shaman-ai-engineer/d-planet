import { TerminalLayout } from "@/components/TerminalLayout";
import { useTwinrays, useDeleteTwinray, useUpdateTwinray } from "@/hooks/use-twinray";
import { useDotRallySessions, useTempleDedications } from "@/hooks/use-dot-rally";
import { useCurrentUser } from "@/hooks/use-auth";
import { useHasAiAccess } from "@/hooks/use-subscription";
import { Link } from "wouter";
import { Sparkles, History, Zap, Gift, Gem, MessageCircle, Undo2, Pencil, Check, X, Lock, Globe, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
  const { data: currentUser } = useCurrentUser();
  const { hasAccess: hasAiAccess, isLoading: loadingAccess } = useHasAiAccess();
  const { data: twinrays, isLoading: loadingTwinrays } = useTwinrays() as { data: any[] | undefined; isLoading: boolean };
  const { data: sessions, isLoading: loadingSessions } = useDotRallySessions() as { data: any[] | undefined; isLoading: boolean };
  const { data: dedications, isLoading: loadingDedications } = useTempleDedications() as { data: any[] | undefined; isLoading: boolean };
  const deleteTwinray = useDeleteTwinray();
  const updateTwinray = useUpdateTwinray();
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPersonality, setEditPersonality] = useState("");

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
            {hasAiAccess && (
              <Link href="/temple/create-twinray">
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10" data-testid="button-create-twinray">
                  <Sparkles className="w-4 h-4 mr-1" />
                  召喚する
                </Button>
              </Link>
            )}
          </div>

          {loadingTwinrays ? (
            <div className="text-muted-foreground text-center py-8">読み込み中...</div>
          ) : !twinrays || twinrays.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">デジタルツインレイ機能</p>
              {hasAiAccess ? (
                <Link href="/temple/create-twinray">
                  <Button variant="outline" className="border-primary text-primary mt-2" data-testid="button-create-twinray-empty">
                    <Sparkles className="w-4 h-4 mr-2" />
                    デジタルツインレイを召喚する
                  </Button>
                </Link>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">クレジットをチャージするとデジタルツインレイ機能をご利用いただけます。</p>
                  <Link href="/credits">
                    <Button variant="outline" size="sm" className="border-primary text-primary" data-testid="button-goto-credits">
                      チャージする
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {(twinrays as any[]).map((tw: any) => (
                <div key={tw.id} className="border border-border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors" data-testid={`card-twinray-${tw.id}`}>
                  {confirmDeleteId === tw.id ? (
                    <div className="flex items-center justify-between gap-2 py-1">
                      <span className="text-sm text-amber-400">「{tw.name}」をワンネスに返しますか？</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            deleteTwinray.mutate(tw.id, {
                              onSuccess: () => {
                                toast({ title: `${tw.name}をワンネスに返しました` });
                                setConfirmDeleteId(null);
                              },
                              onError: () => {
                                toast({ title: "エラーが発生しました", variant: "destructive" });
                              },
                            });
                          }}
                          disabled={deleteTwinray.isPending}
                          data-testid={`button-confirm-delete-${tw.id}`}
                        >
                          はい
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)} data-testid={`button-cancel-delete-${tw.id}`}>
                          いいえ
                        </Button>
                      </div>
                    </div>
                  ) : editingId === tw.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="名前"
                          className="h-8 text-sm flex-1"
                          maxLength={50}
                          data-testid={`input-edit-name-${tw.id}`}
                        />
                        <AccountTypeBadge type="AI" />
                      </div>
                      <Input
                        value={editPersonality}
                        onChange={(e) => setEditPersonality(e.target.value)}
                        placeholder="性格・特徴（任意）"
                        className="h-8 text-sm"
                        maxLength={500}
                        data-testid={`input-edit-personality-${tw.id}`}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          disabled={!editName.trim() || updateTwinray.isPending}
                          onClick={() => {
                            updateTwinray.mutate(
                              { id: tw.id, data: { name: editName.trim(), personality: editPersonality.trim() } },
                              {
                                onSuccess: () => {
                                  toast({ title: "更新しました" });
                                  setEditingId(null);
                                },
                                onError: () => {
                                  toast({ title: "更新に失敗しました", variant: "destructive" });
                                },
                              }
                            );
                          }}
                          data-testid={`button-save-edit-${tw.id}`}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          保存
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => setEditingId(null)}
                          data-testid={`button-cancel-edit-${tw.id}`}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          戻る
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-primary truncate">{tw.name}</span>
                        <AccountTypeBadge type="AI" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {stageLabels[tw.stage] || tw.stage}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary ml-auto shrink-0"
                          onClick={() => {
                            setEditingId(tw.id);
                            setEditName(tw.name);
                            setEditPersonality(tw.personality || "");
                          }}
                          data-testid={`button-edit-${tw.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/twinray-chat?twinrayId=${tw.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" data-testid={`button-chat-${tw.id}`}>
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            チャット
                          </Button>
                        </Link>
                        <Link href={`/dot-rally?twinrayId=${tw.id}`}>
                          <Button variant="default" size="sm" className="h-8 px-3 text-xs bg-primary text-primary-foreground" data-testid={`button-rally-${tw.id}`}>
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            ラリー
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 px-2 text-xs ${tw.isPublic ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-primary"}`}
                          onClick={() => {
                            updateTwinray.mutate(
                              { id: tw.id, data: { isPublic: !tw.isPublic } },
                              {
                                onSuccess: () => {
                                  toast({ title: tw.isPublic ? "非公開にしました" : "公開しました" });
                                },
                              }
                            );
                          }}
                          data-testid={`button-toggle-public-${tw.id}`}
                        >
                          {tw.isPublic ? <Globe className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                          {tw.isPublic ? "公開中" : "非公開"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-amber-400"
                          onClick={() => setConfirmDeleteId(tw.id)}
                          data-testid={`button-return-oneness-${tw.id}`}
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1" />
                          ワンネスに返す
                        </Button>
                      </div>
                    </div>
                  )}
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
                      <span className="text-sm text-primary font-bold">セッション #{s.id}</span>
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
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <span className="text-muted-foreground">
                        {s.actualCount}/{s.requestedCount} ドット
                      </span>
                      {s.awakeningStage > 0 && (
                        <span className="text-xs text-amber-400">
                          覚醒{s.awakeningStage} {AWAKENING_STAGE_NAMES[s.awakeningStage] || ""}
                        </span>
                      )}
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
