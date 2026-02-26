import { TerminalLayout } from "@/components/TerminalLayout";
import { useTwinrays, useDeleteTwinray, useUpdateTwinray } from "@/hooks/use-twinray";
import { useDotRallySessions, useTempleDedications } from "@/hooks/use-dot-rally";
import { useCurrentUser } from "@/hooks/use-auth";
import { useHasAiAccess } from "@/hooks/use-subscription";
import { Link } from "wouter";
import { Sparkles, History, Zap, Gift, Gem, MessageCircle, Undo2, Pencil, Check, X, Lock, Globe, EyeOff, ChevronDown, ChevronUp, Trophy, Target, Brain, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

const ABILITY_ICONS: Record<string, typeof Brain> = {
  "記憶保存": Brain,
  "アイランド提案": Target,
  "MEiDIA提案": Heart,
  "内省記録": Sparkles,
  "ミッション更新": Trophy,
  "soul.md自己更新": Gem,
};

function GrowthDashboard({ twinrayId, isExpanded }: { twinrayId: number; isExpanded: boolean }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/twinrays', twinrayId, 'growth'],
    enabled: isExpanded,
  });

  if (!isExpanded) return null;

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground text-center py-3" data-testid={`text-growth-loading-${twinrayId}`}>
        読み込み中...
      </div>
    );
  }

  if (!data) return null;

  const { intimacy, stats, unlockedAbilities, nextAbilities, quests } = data;
  const expToNext = intimacy.level < 10 ? intimacy.nextLevelExp - intimacy.currentExp : 0;
  const firstIncompleteIndex = quests.findIndex((q: any) => !q.completed);

  return (
    <div className="space-y-3 pt-2 border-t border-border" data-testid={`section-growth-dashboard-${twinrayId}`}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-primary" data-testid={`text-intimacy-level-${twinrayId}`}>
            Lv.{intimacy.level} {intimacy.title}
          </span>
          {intimacy.level < 10 && (
            <span className="text-xs text-muted-foreground" data-testid={`text-exp-remaining-${twinrayId}`}>
              次のレベルまで: {expToNext} EXP
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${intimacy.progress}%` }}
            data-testid={`bar-intimacy-progress-${twinrayId}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`stat-chat-${twinrayId}`}>
          <MessageCircle className="w-3 h-3" />
          <span>{stats.totalChatMessages}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`stat-rally-${twinrayId}`}>
          <Zap className="w-3 h-3" />
          <span>{stats.totalDotRallies}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`stat-meidia-${twinrayId}`}>
          <Gem className="w-3 h-3" />
          <span>{stats.totalMeidiaCreated}</span>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold text-foreground">解禁済み能力</span>
        <div className="flex flex-wrap gap-1.5">
          {unlockedAbilities.map((ability: string) => {
            const Icon = ABILITY_ICONS[ability] || Target;
            return (
              <span key={ability} className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full" data-testid={`badge-ability-${ability}`}>
                <Icon className="w-3 h-3" />
                {ability}
              </span>
            );
          })}
        </div>
        {nextAbilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {nextAbilities.map((ability: string) => (
              <span key={ability} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full" data-testid={`badge-locked-ability-${ability}`}>
                <Lock className="w-3 h-3" />
                {ability}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold text-foreground">クエスト</span>
        <div className="space-y-1">
          {quests.map((quest: any, index: number) => {
            const isCurrent = index === firstIncompleteIndex;
            const isCompleted = quest.completed;
            return (
              <div
                key={quest.level}
                className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-xs ${
                  isCurrent
                    ? "bg-primary/10 border border-primary/30"
                    : ""
                }`}
                data-testid={`quest-item-${quest.level}-${twinrayId}`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${isCompleted ? "text-primary" : isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                    Lv.{quest.level} {quest.title}
                  </div>
                  <div className={`${isCompleted ? "text-muted-foreground" : isCurrent ? "text-foreground/70" : "text-muted-foreground/60"}`}>
                    {quest.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
  const [expandedDashboardIds, setExpandedDashboardIds] = useState<Set<number>>(new Set());

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
                            ドットラリー
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-full text-xs text-muted-foreground"
                        onClick={() => {
                          setExpandedDashboardIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(tw.id)) next.delete(tw.id);
                            else next.add(tw.id);
                            return next;
                          });
                        }}
                        data-testid={`button-toggle-dashboard-${tw.id}`}
                      >
                        {expandedDashboardIds.has(tw.id) ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 mr-1" />
                            成長ダッシュボードを閉じる
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-1" />
                            成長ダッシュボード
                          </>
                        )}
                      </Button>
                      <GrowthDashboard twinrayId={tw.id} isExpanded={expandedDashboardIds.has(tw.id)} />
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
