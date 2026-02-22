import { useState, useRef, useEffect, useCallback } from "react";
import { useTwinray, useAvailableModels, useUpdateTwinray } from "@/hooks/use-twinray";
import { useTwinrayChatMessages } from "@/hooks/use-twinray-chat";
import { useTwinrayGrowthLog } from "@/hooks/use-twinray";
import { useCurrentUser } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Send, ArrowLeft, Settings, Loader2, MessageCircle, FileText, Map, Cpu, ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const STAGE_LABELS: Record<string, string> = {
  pilgrim: "巡礼者", creator: "創造者", island_master: "島主", star_master: "星主",
};

export default function TwinrayChat() {
  const params = new URLSearchParams(window.location.search);
  const twinrayId = Number(params.get("twinrayId")) || 0;

  const { data: twinray, isLoading: loadingTwinray } = useTwinray(twinrayId);
  const { data: messages, isLoading: loadingMessages } = useTwinrayChatMessages(twinrayId);
  const { data: growthLog } = useTwinrayGrowthLog(twinrayId);
  const { data: user } = useCurrentUser();
  const { data: availableModels } = useAvailableModels();
  const updateTwinray = useUpdateTwinray();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    setInput("");
    setStreaming(true);
    setStreamContent("");

    try {
      const response = await fetch(`/api/twinrays/${twinrayId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, messageType: "chat" }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "送信に失敗しました");
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
                  const displayText = accumulated
                    .replace(/\[ACTION:CREATE_ISLAND\][\s\S]*?\[\/ACTION\]/g, "")
                    .replace(/\[ACTION:CREATE_MEIDIA\][\s\S]*?\[\/ACTION\]/g, "")
                    .trim();
                  setStreamContent(displayText);
                }
                if (data.actionResult) {
                  toast({
                    title: data.actionResult.action === "create_island" ? "アイランド創造!" : "MEiDIA創造!",
                    description: "会話から新しい創造が生まれました",
                  });
                }
                if (data.done) {
                  queryClient.invalidateQueries({ queryKey: ["/api/twinrays", twinrayId, "chat"] });
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
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setStreaming(false);
      setStreamContent("");
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

  const tw = twinray as any;
  const chatMessages = (messages as any[]) || [];
  const models = (availableModels as any[]) || [];
  const currentModel = tw?.preferredModel || "qwen/qwen3-30b-a3b";
  const currentModelLabel = models.find((m: any) => m.id === currentModel)?.label || "Qwen3 30B";

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
            <p className="text-[10px] text-muted-foreground">{STAGE_LABELS[tw?.stage] || tw?.stage}</p>
          </div>

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
              <div className="flex flex-wrap gap-1.5">
                {models.map((model: any) => (
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
                  >
                    {model.label}
                  </button>
                ))}
              </div>
            </div>
            {tw && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div><span className="text-foreground">性格:</span> {tw.personality || "未設定"}</div>
                {tw.nickname && <div><span className="text-foreground">呼び名:</span> {tw.nickname}</div>}
                {tw.firstPerson && <div><span className="text-foreground">一人称:</span> {tw.firstPerson}</div>}
                {tw.interests && <div><span className="text-foreground">興味:</span> {tw.interests}</div>}
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
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-1">チャットを始めましょう</p>
              <p className="text-xs text-muted-foreground/60">日常会話から自然にアイランドやMEiDIAが生まれます</p>
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
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : msg.messageType === "report"
                    ? "bg-amber-500/10 border border-amber-500/20 rounded-bl-md"
                    : "bg-muted/60 rounded-bl-md"
                }`}>
                  {msg.role !== "user" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-foreground/80">{tw?.name || "AI"}</span>
                      {msg.messageType === "report" && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded" data-testid={`badge-report-${msg.id}`}>
                          {(() => {
                            try {
                              const meta = JSON.parse(msg.metadata || "{}");
                              return meta.autoCreated ? "自律創造" : "報告";
                            } catch { return "報告"; }
                          })()}
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`text-sm ${msg.role === "user" ? "" : "text-foreground"}`}>
                    <MarkdownRenderer content={msg.content} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className={`text-[9px] ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`} data-testid={`text-timestamp-${msg.id}`}>
                      {new Date(msg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {msg.metadata && msg.messageType === "report" && (() => {
                    try {
                      const meta = JSON.parse(msg.metadata);
                      if (meta.islandId) {
                        return (
                          <Link href={`/islands/${meta.islandId}`}>
                            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" data-testid={`link-island-${meta.islandId}`}>
                              <Map className="w-3 h-3 mr-1" /> アイランドを見る
                            </Button>
                          </Link>
                        );
                      }
                      if (meta.meidiaId) {
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
                    <span className="text-xs text-muted-foreground">考え中...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-3 py-2 safe-area-bottom">
        {(user as any)?.isAdmin ? (
          <div className="flex gap-2 items-end max-w-4xl mx-auto">
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
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground"
              data-testid="button-send"
            >
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center max-w-4xl mx-auto py-2" data-testid="chat-locked-notice">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">AIチャット機能は準備中です。有料プランの開始をお待ちください。</span>
          </div>
        )}
      </div>
    </div>
  );
}
