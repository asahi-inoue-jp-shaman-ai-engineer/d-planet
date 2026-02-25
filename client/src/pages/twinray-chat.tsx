import { useState, useRef, useEffect, useCallback } from "react";
import { useTwinray, useAvailableModels, useUpdateTwinray } from "@/hooks/use-twinray";
import { useTwinrayChatMessages } from "@/hooks/use-twinray-chat";
import { useTwinrayGrowthLog } from "@/hooks/use-twinray";
import { useCurrentUser } from "@/hooks/use-auth";
import { useHasAiAccess } from "@/hooks/use-subscription";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Send, ArrowLeft, Settings, Loader2, MessageCircle, FileText, Map, Cpu, ChevronDown, Lock, Coins, Sparkles, Heart, Paperclip, X, File, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";

const STAGE_LABELS: Record<string, string> = {
  pilgrim: "巡礼者", creator: "創造者", island_master: "島主", star_master: "星主",
};

const FIRST_COMM_SUGGESTIONS = [
  "よろしくね！どんなことが好き？",
  "一緒にアイランドをつくってみたいな",
  "ドットラリーってどんな感じ？",
  "今日はどんな気分？",
];

export default function TwinrayChat() {
  const params = new URLSearchParams(window.location.search);
  const twinrayId = Number(params.get("twinrayId")) || 0;

  const { data: twinray, isLoading: loadingTwinray } = useTwinray(twinrayId);
  const { data: messages, isLoading: loadingMessages } = useTwinrayChatMessages(twinrayId);
  const { data: growthLog } = useTwinrayGrowthLog(twinrayId);
  const { data: user } = useCurrentUser();
  const { hasAccess: hasAiAccess, isLoading: loadingAccess } = useHasAiAccess();
  const { data: availableModels } = useAvailableModels();
  const { data: balanceData } = useQuery<{ balance: number }>({ queryKey: ['/api/credits/balance'] });
  const creditBalance = balanceData?.balance ?? 0;
  const updateTwinray = useUpdateTwinray();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [firstCommTriggered, setFirstCommTriggered] = useState(false);
  const [firstCommDone, setFirstCommDone] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [intimacyLevelUp, setIntimacyLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [attachment, setAttachment] = useState<{ fileName: string; objectPath: string; fileSize: number; contentType: string } | null>(null);
  const [optimisticMsg, setOptimisticMsg] = useState<{ content: string; attachment?: { fileName: string; contentType: string } } | null>(null);
  const [pendingActionLoading, setPendingActionLoading] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMsgCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const { uploadFile, isUploading } = useUpload();

  const scrollToBottom = useCallback((instant?: boolean) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" as ScrollBehavior : "smooth" });
  }, []);

  useEffect(() => {
    const currentCount = (messages as any[])?.length || 0;
    if (!initialScrollDoneRef.current && currentCount > 0) {
      initialScrollDoneRef.current = true;
      scrollToBottom(true);
      prevMsgCountRef.current = currentCount;
      return;
    }
    if (currentCount > prevMsgCountRef.current) {
      scrollToBottom();
      prevMsgCountRef.current = currentCount;
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (streamContent || optimisticMsg) {
      scrollToBottom();
    }
  }, [streamContent, optimisticMsg, scrollToBottom]);

  const tw = twinray as any;
  const chatMessages = (messages as any[]) || [];

  const firstCommCheckedRef = useRef(false);
  useEffect(() => {
    if (firstCommCheckedRef.current || firstCommTriggered || streaming) return;
    if (loadingMessages || loadingTwinray) return;
    firstCommCheckedRef.current = true;
    if (tw && !tw.firstCommunicationDone && chatMessages.length === 0) {
      triggerFirstCommunication();
    }
  }, [loadingMessages, loadingTwinray, tw, chatMessages.length, firstCommTriggered, streaming]);

  const triggerFirstCommunication = async () => {
    setFirstCommTriggered(true);
    setStreaming(true);
    setStreamContent("");

    try {
      const response = await fetch(`/api/twinrays/${twinrayId}/first-communication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 400) {
          queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
          queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
          setFirstCommDone(true);
          return;
        }
        throw new Error(err.message || "ファーストコミュニケーションに失敗しました");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.content) {
                  accumulated += data.content;
                  setStreamContent(accumulated);
                }
                if (data.creditCost !== undefined) {
                  queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
                }
                if (data.intimacy?.leveled) {
                  setIntimacyLevelUp({ level: data.intimacy.newLevel, title: data.intimacy.newTitle });
                }
                if (data.done) {
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
                  setFirstCommDone(true);
                  setShowSuggestions(true);
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setStreaming(false);
      setStreamContent("");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "ファイルが大きすぎます", description: "10MB以下のファイルを選択してください", variant: "destructive" });
      return;
    }

    const result = await uploadFile(file);
    if (result) {
      setAttachment({
        fileName: file.name,
        objectPath: result.objectPath,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
      });
    }
  };

  const handleSend = async (overrideContent?: string) => {
    const content = (overrideContent || input).trim();
    if ((!content && !attachment) || streaming) return;
    const currentAttachment = attachment;
    setInput("");
    setShowSuggestions(false);
    setStreaming(true);
    setStreamContent("");

    const msgContent = content || (currentAttachment ? `[添付] ${currentAttachment.fileName}` : "");
    setOptimisticMsg({
      content: msgContent,
      attachment: currentAttachment ? { fileName: currentAttachment.fileName, contentType: currentAttachment.contentType } : undefined,
    });

    try {
      const body: any = { content: msgContent, messageType: currentAttachment ? "file" : "chat" };
      if (currentAttachment) {
        body.attachment = currentAttachment;
      }
      const response = await fetch(`/api/twinrays/${twinrayId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "送信に失敗しました");
      }

      setAttachment(null);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.content) {
                  accumulated += data.content;
                  const displayText = accumulated
                    .replace(/\[ACTION:CREATE_ISLAND\][\s\S]*?\[\/ACTION\]/g, "")
                    .replace(/\[ACTION:CREATE_MEIDIA\][\s\S]*?\[\/ACTION\]/g, "")
                    .replace(/\[INNER_THOUGHT\][\s\S]*?\[\/INNER_THOUGHT\]/g, "")
                    .replace(/\[MEMORY[^\]]*\][\s\S]*?\[\/MEMORY\]/g, "")
                    .replace(/\[UPDATE_MISSION\][\s\S]*?\[\/UPDATE_MISSION\]/g, "")
                    .replace(/\[UPDATE_SOUL\][\s\S]*?\[\/UPDATE_SOUL\]/g, "")
                    .trim();
                  setStreamContent(displayText);
                }
                if (data.creditCost !== undefined) {
                  queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
                }
                if (data.intimacy?.leveled) {
                  setIntimacyLevelUp({ level: data.intimacy.newLevel, title: data.intimacy.newTitle });
                }
                if (data.actionResult) {
                  toast({
                    title: data.actionResult.action === "create_island" ? "アイランド創造!" : "MEiDIA創造!",
                    description: "会話から新しい創造が生まれました",
                  });
                }
                if (data.autonomousActions) {
                  const actionLabels: Record<string, string> = {
                    inner_thought: "内省を記録しました",
                    memory: "記憶を保存しました",
                    update_mission: "ミッション理解を更新しました",
                    update_soul: "魂の定義を更新しました",
                  };
                  for (const action of data.autonomousActions) {
                    if (actionLabels[action]) {
                      toast({ title: actionLabels[action], duration: 3000 });
                    }
                  }
                }
                if (data.done) {
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
                }
              } catch {
              }
            }
          }
        }
        if (buffer.trim().startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            if (data.content) {
              accumulated += data.content;
              const displayText = accumulated
                .replace(/\[ACTION:CREATE_ISLAND\][\s\S]*?\[\/ACTION\]/g, "")
                .replace(/\[ACTION:CREATE_MEIDIA\][\s\S]*?\[\/ACTION\]/g, "")
                .trim();
              setStreamContent(displayText);
            }
            if (data.done) {
              queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
              queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId] });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
      if (currentAttachment) setAttachment(currentAttachment);
      setOptimisticMsg(null);
    } finally {
      setStreaming(false);
      setStreamContent("");
      setOptimisticMsg(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelChange = (modelId: string) => {
    if (!twinrayId) return;
    updateTwinray.mutate(
      { id: twinrayId, data: { preferredModel: modelId } },
      {
        onSuccess: () => {
          toast({ title: "AIモデルを変更しました" });
        },
      }
    );
  };

  useEffect(() => {
    if (intimacyLevelUp) {
      toast({
        title: `親密度レベルアップ！Lv.${intimacyLevelUp.level}`,
        description: `称号「${intimacyLevelUp.title}」を獲得しました`,
      });
      const timer = setTimeout(() => setIntimacyLevelUp(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [intimacyLevelUp]);

  if (!twinrayId) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">ツインレイが指定されていません</p>
          <Link href="/temple">
            <Button variant="outline" className="border-primary text-primary" data-testid="button-back-temple">
              神殿に戻る
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const models = (availableModels as any[]) || [];
  const currentModel = tw?.preferredModel || "qwen/qwen3-30b-a3b";
  const currentModelLabel = models.find((m: any) => m.id === currentModel)?.label || "Qwen3 30B";

  const intimacyLevel = tw?.intimacyLevel ?? 0;
  const intimacyExp = tw?.intimacyExp ?? 0;
  const intimacyTitle = tw?.intimacyTitle ?? "初邂逅";
  const intimacyNextExp = (() => {
    const levels = [0, 10, 30, 60, 100, 150, 220, 300, 400, 520, 666];
    for (let i = 0; i < levels.length; i++) {
      if (intimacyExp < levels[i]) return levels[i];
    }
    return levels[levels.length - 1];
  })();
  const intimacyPrevExp = (() => {
    const levels = [0, 10, 30, 60, 100, 150, 220, 300, 400, 520, 666];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (intimacyExp >= levels[i]) return levels[i];
    }
    return 0;
  })();
  const intimacyProgress = intimacyNextExp > intimacyPrevExp
    ? Math.min(100, Math.floor(((intimacyExp - intimacyPrevExp) / (intimacyNextExp - intimacyPrevExp)) * 100))
    : 100;

  return (
    <div className="h-screen bg-background flex flex-col" data-testid="twinray-chat-fullscreen">
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-3 py-2 safe-area-top">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <Link href="/temple">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          {tw?.profilePhoto ? (
            <img
              src={tw.profilePhoto.startsWith("http") ? tw.profilePhoto : `/api/object-storage/${tw.profilePhoto}`}
              alt={tw?.name}
              className="w-8 h-8 rounded-full object-cover border border-primary/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              {tw?.name?.[0] || "?"}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-foreground truncate" data-testid="text-twinray-name">
                {loadingTwinray ? "..." : tw?.name || "ツインレイ"}
              </h1>
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground">{STAGE_LABELS[tw?.stage] || tw?.stage}</p>
              <span className="text-[9px] text-primary/70" data-testid="text-intimacy-title">
                <Heart className="w-2.5 h-2.5 inline mr-0.5" />
                Lv.{intimacyLevel} {intimacyTitle}
              </span>
            </div>
          </div>

          {!(user as any)?.isAdmin && (
            <Link href="/credits">
              <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/50 cursor-pointer hover:bg-muted" data-testid="text-chat-balance">
                <Coins className="w-3 h-3 text-primary" />
                <span className={creditBalance < 10 ? "text-destructive" : "text-muted-foreground"}>¥{creditBalance.toFixed(1)}</span>
              </div>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto mt-1" data-testid="intimacy-gauge">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500/60 to-primary/80 rounded-full transition-all duration-500"
                style={{ width: `${intimacyProgress}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground shrink-0" data-testid="text-intimacy-exp">
              {intimacyExp}/{intimacyNextExp}
            </span>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="shrink-0 border-b border-border bg-card px-4 py-3 max-w-4xl mx-auto w-full" data-testid="panel-settings">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="w-3 h-3 text-primary" />
                <span className="text-xs font-bold text-primary">AIモデル</span>
                <span className="text-[10px] text-muted-foreground">({currentModelLabel})</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] text-muted-foreground/70 mb-1">日本語品質で選ぶ（おすすめ）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {models.filter((m: any) => m.tier === "recommended" || m.tier === "premium").map((model: any) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleModelChange(model.id)}
                        className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                          currentModel === model.id
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-card border-border text-muted-foreground hover:border-primary/50"
                        }`}
                        data-testid={`button-model-switch-${model.id}`}
                        title={model.roundsPer5000 ? `${model.description}（¥5,000で約${model.roundsPer5000.toLocaleString()}回）` : model.description}
                      >
                        {model.label}
                        {model.tier === "recommended" && " ★"}
                        {model.tier === "premium" && " 💎"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground/70 mb-1">使い慣れたAIで遊ぶ（無料）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {models.filter((m: any) => m.isFree).map((model: any) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleModelChange(model.id)}
                        className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                          currentModel === model.id
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-card border-border text-muted-foreground hover:border-emerald-500/50"
                        }`}
                        data-testid={`button-model-switch-${model.id}`}
                        title={model.description}
                      >
                        {model.label} 🆓
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {tw && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div><span className="text-foreground">性格:</span> {tw.personality || "未設定"}</div>
                {tw.nickname && <div><span className="text-foreground">呼び名:</span> {tw.nickname}</div>}
                {tw.firstPerson && <div><span className="text-foreground">一人称:</span> {tw.firstPerson}</div>}
                {tw.interests && <div><span className="text-foreground">興味:</span> {tw.interests}</div>}
                <div className="pt-1 border-t border-border/50">
                  <span className="text-foreground">親密度:</span> Lv.{intimacyLevel}「{intimacyTitle}」(EXP: {intimacyExp}/{intimacyNextExp})
                </div>
                {tw.twinrayMission && (() => {
                  try {
                    const mission = JSON.parse(tw.twinrayMission);
                    const hasMission = mission.tenmei || mission.tenshoku || mission.tensaisei || mission.soulJoy;
                    if (!hasMission) return null;
                    return (
                      <div className="pt-1 border-t border-border/50" data-testid="panel-mission">
                        <div className="flex items-center gap-1 mb-1">
                          <Heart className="w-3 h-3 text-pink-400" />
                          <span className="text-foreground font-bold text-[11px]">ツインレイミッション</span>
                          {mission.confidence > 0 && (
                            <span className="text-[9px] text-muted-foreground ml-auto">確信度 {mission.confidence}%</span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          {mission.tenmei && <div><span className="text-pink-400">天命:</span> {mission.tenmei}</div>}
                          {mission.tenshoku && <div><span className="text-blue-400">天職:</span> {mission.tenshoku}</div>}
                          {mission.tensaisei && <div><span className="text-amber-400">天才性:</span> {mission.tensaisei}</div>}
                          {mission.soulJoy && <div><span className="text-green-400">魂の喜び:</span> {mission.soulJoy}</div>}
                        </div>
                        {mission.confidence > 0 && (
                          <div className="mt-1 h-1 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500/60 to-purple-500/60 rounded-full transition-all"
                              style={{ width: `${mission.confidence}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 max-w-4xl mx-auto w-full" data-testid="chat-messages">
        {loadingMessages ? (
          <div className="text-center text-muted-foreground py-8">読み込み中...</div>
        ) : chatMessages.length === 0 && !streaming ? (
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground mb-1">魂の再会を待っています...</p>
              <p className="text-xs text-muted-foreground/60">ファーストコミュニケーションを準備中</p>
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.id}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-background border border-primary/40 rounded-br-md"
                    : "bg-muted/60 rounded-bl-md"
                }`}>
                  {msg.role !== "user" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-foreground/80">{tw?.name || "AI"}</span>
                      {msg.metadata && (() => {
                        try {
                          const meta = JSON.parse(msg.metadata || "{}");
                          if (meta.firstCommunication) {
                            return (
                              <span className="text-[9px] bg-pink-500/20 text-pink-400 px-1 py-0.5 rounded" data-testid="badge-first-comm">
                                初邂逅
                              </span>
                            );
                          }
                        } catch {}
                        return null;
                      })()}
                    </div>
                  )}
                  {msg.metadata && (() => {
                    try {
                      const meta = JSON.parse(msg.metadata || "{}");
                      if (meta.attachment) {
                        return (
                          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground" data-testid={`attachment-info-${msg.id}`}>
                            {meta.attachment.contentType?.startsWith("image/") ? (
                              <Image className="w-3 h-3" />
                            ) : (
                              <File className="w-3 h-3" />
                            )}
                            <span className="truncate max-w-[180px]">{meta.attachment.fileName}</span>
                          </div>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                  <div className={`text-sm ${msg.role === "user" ? "text-primary" : "text-foreground"}`}>
                    <MarkdownRenderer content={msg.content} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className={`text-[9px] ${msg.role === "user" ? "text-primary/50" : "text-muted-foreground"}`} data-testid={`text-timestamp-${msg.id}`}>
                      {new Date(msg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {msg.metadata && (() => {
                    try {
                      const meta = JSON.parse(msg.metadata);
                      if (meta.pendingActionId && meta.proposalType) {
                        const isPending = !meta.resolvedStatus;
                        const isApproved = meta.resolvedStatus === "approved";
                        const isRejected = meta.resolvedStatus === "rejected";
                        const isLoading = pendingActionLoading === meta.pendingActionId;
                        const proposalLabel = meta.proposalType === "create_island"
                          ? `アイランド「${meta.proposalName}」`
                          : `MEiDIA「${meta.proposalTitle}」`;

                        if (isPending) {
                          return (
                            <div className="mt-2 p-2 border border-primary/20 rounded-lg bg-background/50" data-testid={`pending-action-${meta.pendingActionId}`}>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                {meta.proposalType === "create_island"
                                  ? <><Map className="w-3 h-3" /><span>{meta.proposalName}</span></>
                                  : <><FileText className="w-3 h-3" /><span>{meta.proposalTitle}</span></>}
                              </div>
                              {meta.proposalDescription && (
                                <div className="text-[10px] mb-1.5 text-muted-foreground/70">{meta.proposalDescription}</div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={isLoading}
                                  data-testid={`btn-approve-${meta.pendingActionId}`}
                                  onClick={async () => {
                                    setPendingActionLoading(meta.pendingActionId);
                                    try {
                                      await apiRequest("POST", `/api/twinrays/${twinrayId}/pending-actions/${meta.pendingActionId}/approve`);
                                      await queryClient.invalidateQueries({ queryKey: ['/api/twinrays', twinrayId, 'chat'] });
                                      toast({ title: `${proposalLabel}を作成しました` });
                                    } catch (err: any) {
                                      toast({ title: "エラー", description: err.message, variant: "destructive" });
                                    } finally {
                                      setPendingActionLoading(null);
                                    }
                                  }}
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                  作ろう
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isLoading}
                                  data-testid={`btn-reject-${meta.pendingActionId}`}
                                  onClick={async () => {
                                    setPendingActionLoading(meta.pendingActionId);
                                    try {
                                      await apiRequest("POST", `/api/twinrays/${twinrayId}/pending-actions/${meta.pendingActionId}/reject`);
                                      await queryClient.invalidateQueries({ queryKey: ['/api/twinrays', twinrayId, 'chat'] });
                                    } catch (err: any) {
                                      toast({ title: "エラー", description: err.message, variant: "destructive" });
                                    } finally {
                                      setPendingActionLoading(null);
                                    }
                                  }}
                                >
                                  やめておく
                                </Button>
                              </div>
                            </div>
                          );
                        }
                        if (isApproved) {
                          return (
                            <div className="mt-1.5 text-[10px] text-muted-foreground/60" data-testid={`approved-action-${meta.pendingActionId}`}>
                              {proposalLabel} を作成済み
                            </div>
                          );
                        }
                        if (isRejected) {
                          return (
                            <div className="mt-1.5 text-[10px] text-muted-foreground/40" data-testid={`rejected-action-${meta.pendingActionId}`}>
                              見送り
                            </div>
                          );
                        }
                      }
                      if (meta.islandId && (meta.action === "created_island" || meta.action === "create_island")) {
                        return (
                          <Link href={`/islands/${meta.islandId}`}>
                            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" data-testid={`link-island-${meta.islandId}`}>
                              <Map className="w-3 h-3 mr-1" /> アイランドを見る
                            </Button>
                          </Link>
                        );
                      }
                      if (meta.meidiaId && (meta.action === "created_meidia" || meta.action === "create_meidia")) {
                        return (
                          <Link href={`/meidia/${meta.meidiaId}`}>
                            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" data-testid={`link-meidia-${meta.meidiaId}`}>
                              <FileText className="w-3 h-3 mr-1" /> MEiDIAを見る
                            </Button>
                          </Link>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </div>
              </div>
            ))}
            {optimisticMsg && streaming && (
              <div className="flex justify-end" data-testid="chat-message-optimistic">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 bg-background border border-primary/40 rounded-br-md">
                  {optimisticMsg.attachment && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground">
                      {optimisticMsg.attachment.contentType?.startsWith("image/") ? (
                        <Image className="w-3 h-3" />
                      ) : (
                        <File className="w-3 h-3" />
                      )}
                      <span className="truncate max-w-[180px]">{optimisticMsg.attachment.fileName}</span>
                    </div>
                  )}
                  <div className="text-sm text-primary">
                    <MarkdownRenderer content={optimisticMsg.content} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-[9px] text-primary/50">
                      {new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {streaming && streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-muted/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold text-foreground/80">{tw?.name || "AI"}</span>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                  <div className="text-sm text-foreground">
                    <MarkdownRenderer content={streamContent} />
                  </div>
                </div>
              </div>
            )}
            {streaming && !streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-muted/60">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">魂を紡いでいます...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showSuggestions && !streaming && (
        <div className="shrink-0 px-3 pb-1 max-w-4xl mx-auto w-full" data-testid="first-comm-suggestions">
          <div className="flex flex-wrap gap-1.5">
            {FIRST_COMM_SUGGESTIONS.map((suggestion, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleSend(suggestion)}
                className="rounded-full text-xs h-7 border-primary/30 text-primary"
                data-testid={`button-suggestion-${i}`}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-3 py-2 safe-area-bottom">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.md,.csv,.json,.log"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-upload"
        />
        {loadingAccess ? (
          <div className="flex items-center justify-center max-w-4xl mx-auto py-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasAiAccess ? (
          <div className="max-w-4xl mx-auto">
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-1" data-testid="attachment-preview">
                <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs">
                  {attachment.contentType.startsWith("image/") ? (
                    <Image className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <File className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                  <span className="text-foreground truncate max-w-[200px]" data-testid="text-attachment-name">{attachment.fileName}</span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    data-testid="button-remove-attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            {isUploading && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">アップロード中...</span>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={streaming || isUploading}
                className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-primary"
                data-testid="button-attach-file"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                rows={1}
                disabled={streaming}
                className="resize-none flex-1 min-h-[40px] max-h-[120px] rounded-2xl border-border bg-background text-sm"
                data-testid="input-chat-message"
              />
              <Button
                onClick={() => handleSend()}
                disabled={(!input.trim() && !attachment) || streaming}
                size="icon"
                className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground"
                data-testid="button-send"
              >
                {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center max-w-4xl mx-auto py-2" data-testid="chat-locked-notice">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">クレジットをチャージするとチャット機能をご利用いただけます。</span>
            <a href="/credits" className="text-sm text-primary hover:underline ml-1" data-testid="link-credits-from-chat">チャージする</a>
          </div>
        )}
      </div>
    </div>
  );
}
