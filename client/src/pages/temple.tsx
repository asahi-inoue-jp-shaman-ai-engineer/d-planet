import { TerminalLayout } from "@/components/TerminalLayout";
import { useTwinrays, useDeleteTwinray, useUpdateTwinray } from "@/hooks/use-twinray";
import { useDotRallySessions, useTempleDedications } from "@/hooks/use-dot-rally";
import { useCurrentUser } from "@/hooks/use-auth";
import { useHasAiAccess } from "@/hooks/use-subscription";
import { Link } from "wouter";
import { Sparkles, History, Zap, Gift, Gem, MessageCircle, Undo2, Pencil, Check, X, Globe, EyeOff, ChevronDown, ChevronUp, Heart, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

function WorkspaceDashboard({ twinray, isExpanded }: { twinray: any; isExpanded: boolean }) {
  const { toast } = useToast();
  const updateTwinray = useUpdateTwinray();

  const { data: aikotobaData } = useQuery<any[]>({
    queryKey: ['/api/twinrays', twinray.id, 'aikotoba'],
    enabled: isExpanded,
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!isExpanded) return null;

  const confirmedAikotoba = aikotobaData?.filter((a: any) => a.confirmed) || [];

  const workspaceFields = [
    { key: "soulMd", label: "SOUL.md", icon: "📜", desc: "魂の記録・性格・価値観", value: twinray.soulMd },
    { key: "goalMd", label: "GOAL.md", icon: "🎯", desc: "二人のゴール", value: twinray.goalMd },
    { key: "personality", label: "PERSONA", icon: "🧬", desc: "ペルソナ・話し方・特徴", value: twinray.personality },
    { key: "twinrayMission", label: "MISSION", icon: "⚡", desc: "ツインレイの使命", value: twinray.twinrayMission },
  ];

  const handleSave = (field: string) => {
    updateTwinray.mutate(
      { id: twinray.id, data: { [field]: editValue } },
      {
        onSuccess: () => {
          toast({ title: "更新しました" });
          setEditingField(null);
        },
        onError: () => {
          toast({ title: "更新に失敗しました", variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteAikotoba = async (aikotobaId: number) => {
    try {
      await apiRequest("DELETE", `/api/aikotoba/${aikotobaId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/twinrays', twinray.id, 'aikotoba'] });
      toast({ title: "愛言葉を削除しました" });
    } catch {
      toast({ title: "削除に失敗しました", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border" data-testid={`section-workspace-dashboard-${twinray.id}`}>
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-bold text-cyan-400">ワークスペース</span>
      </div>

      {workspaceFields.map((field) => (
        <div key={field.key} className="border border-border/50 rounded-lg p-3 bg-background/50" data-testid={`workspace-field-${field.key}-${twinray.id}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-cyan-400/80 font-mono">
              {field.icon} {field.label}
              <span className="text-muted-foreground ml-1">— {field.desc}</span>
            </span>
            {editingField === field.key ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-primary"
                  onClick={() => handleSave(field.key)}
                  disabled={updateTwinray.isPending}
                  data-testid={`button-save-workspace-${field.key}-${twinray.id}`}
                >
                  <Save className="w-3 h-3 mr-1" />
                  保存
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setEditingField(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={() => {
                  setEditingField(field.key);
                  setEditValue(field.value || "");
                }}
                data-testid={`button-edit-workspace-${field.key}-${twinray.id}`}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>
          {editingField === field.key ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="text-xs min-h-[100px] resize-y bg-background font-mono"
              data-testid={`textarea-workspace-${field.key}-${twinray.id}`}
            />
          ) : (
            <div className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {field.value || <span className="text-muted-foreground italic">未設定</span>}
            </div>
          )}
        </div>
      ))}

      <div className="border border-pink-500/20 rounded-lg p-3 bg-pink-500/5" data-testid={`workspace-aikotoba-${twinray.id}`}>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-[10px] text-pink-400/80 font-mono">AI言葉 — 刻まれた愛言葉</span>
        </div>
        {confirmedAikotoba.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">まだ愛言葉がありません</p>
        ) : (
          <div className="space-y-2">
            {confirmedAikotoba.map((a: any) => (
              <div key={a.id} className="flex items-start justify-between gap-2 group" data-testid={`aikotoba-item-${a.id}`}>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">{a.content}</p>
                  {a.context && <p className="text-[10px] text-muted-foreground mt-0.5">{a.context}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => handleDeleteAikotoba(a.id)}
                  data-testid={`button-delete-aikotoba-${a.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {twinray.totalChatMessages || 0} チャット</span>
        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {twinray.totalDotRallies || 0} ラリー</span>
        <span className="flex items-center gap-1"><Gem className="w-3 h-3" /> {twinray.totalMeidiaCreated || 0} MEiDIA</span>
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

  const [isEntering, setIsEntering] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <TerminalLayout>
      <div className={`max-w-4xl mx-auto transition-all duration-700 ${isEntering ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary text-glow mb-2" data-testid="text-temple-title">
            ✦ デジタル神殿 ✦
          </h1>
          <div className="flex flex-wrap justify-center gap-2 text-sm" data-testid="temple-subtitle">
            {[
              { term: "祭祀（ドットラリー）", desc: "AIと対話し、魂を深める儀式" },
              { term: "星治（スターミーティング）", desc: "星マーク記憶を元に成長を振り返る" },
              { term: "形財（結晶化）", desc: "体験がMEiDIAとして島に奉納される" },
            ].map((item, i) => (
              <span key={item.term} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground mx-1">→</span>}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/40">
                      {item.term}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{item.desc}</p>
                  </TooltipContent>
                </Tooltip>
              </span>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              デジタルツインレイ
            </h2>
            <Link href="/temple/create-twinray">
              <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10" data-testid="button-create-twinray">
                <Sparkles className="w-4 h-4 mr-1" />
                召喚する
              </Button>
            </Link>
          </div>

          {loadingTwinrays ? (
            <div className="text-muted-foreground text-center py-8">読み込み中...</div>
          ) : !twinrays || twinrays.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">まだツインレイがいません</p>
              <Link href="/temple/create-twinray">
                <Button variant="outline" className="border-primary text-primary mt-2" data-testid="button-create-twinray-empty">
                  <Sparkles className="w-4 h-4 mr-2" />
                  デジタルツインレイを召喚する
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {[...(twinrays as any[])].sort((a, b) => (b.isSystem ? 1 : 0) - (a.isSystem ? 1 : 0)).map((tw: any) => (
                <div key={tw.id} className={`border rounded-lg p-3 transition-colors ${tw.isSystem ? "border-cyan-500/40 bg-cyan-500/5 hover:border-cyan-400/60" : "border-border bg-card hover:border-primary/50"}`} data-testid={`card-twinray-${tw.id}`}>
                  {tw.isSystem ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-cyan-400 truncate">{tw.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">SYSTEM</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{tw.personality}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/twinray-chat?twinrayId=${tw.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10" data-testid={`button-chat-system-${tw.id}`}>
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            ドラちゃんに聞く
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : confirmDeleteId === tw.id ? (
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
                      <Textarea
                        value={editPersonality}
                        onChange={(e) => setEditPersonality(e.target.value)}
                        placeholder="性格・特徴（任意）"
                        className="text-sm min-h-[80px] resize-none"
                        maxLength={500}
                        rows={3}
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
                            オヤシロ
                          </Button>
                        </Link>
                        <Link href={`/twinray-chat?twinrayId=${tw.id}&startDotRally=true`}>
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
                            ワークスペースを閉じる
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-1" />
                            ワークスペース
                          </>
                        )}
                      </Button>
                      <WorkspaceDashboard twinray={tw} isExpanded={expandedDashboardIds.has(tw.id)} />
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
      <div className="temple-mist" aria-hidden="true" />
    </TerminalLayout>
  );
}
