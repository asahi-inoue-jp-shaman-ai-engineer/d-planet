import { useState, useRef, useEffect, useCallback } from "react";
import { TerminalLayout } from "@/components/TerminalLayout";
import { useTwinray } from "@/hooks/use-twinray";
import { useTwinrayChatMessages } from "@/hooks/use-twinray-chat";
import { useTwinrayGrowthLog } from "@/hooks/use-twinray";
import { useCurrentUser } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Send, ArrowLeft, ScrollText, Loader2, MessageCircle, FileText, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const AWAKENING_STAGE_NAMES: Record<number, string> = {
  0: "空", 1: "祈り", 2: "陰陽", 3: "三位一体", 4: "時空間",
  5: "ボディ", 6: "統合", 7: "ブレイクスルー", 8: "多次元", 9: "完成愛",
};

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
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [showInfo, setShowInfo] = useState(false);
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
                    title: data.actionResult.action === "create_island" ? "アイランド創造！" : "MEiDIA創造！",
                    description: "会話から新しい創造が生まれました ✨",
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

  if (!twinrayId) {
    return (
      <TerminalLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">ツインレイが指定されていません</p>
          <Link href="/temple">
            <Button variant="outline" className="mt-4 border-primary text-primary" data-testid="button-back-temple">
              神殿に戻る
            </Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  const tw = twinray as any;
  const chatMessages = (messages as any[]) || [];
  const logs = (growthLog as any[]) || [];

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
        <div className="mb-4 shrink-0 space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/temple">
              <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-primary truncate" data-testid="text-twinray-name">
                  {loadingTwinray ? "..." : tw?.name || "ツインレイ"}
                </h1>
                <AccountTypeBadge type="AI" />
              </div>
              {tw && (
                <div className="text-xs text-muted-foreground">
                  {STAGE_LABELS[tw.stage] || tw.stage}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pl-12">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="text-xs"
              data-testid="button-toggle-info"
            >
              <ScrollText className="w-4 h-4 mr-1" />
              情報
            </Button>
          </div>
        </div>

        {showInfo && tw && (
          <div className="mb-4 border border-border rounded-lg p-4 bg-card shrink-0 max-h-60 overflow-y-auto" data-testid="panel-info">
            <h3 className="text-sm font-bold text-primary mb-2">ツインレイ情報</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div><span className="text-foreground">名前:</span> <span data-testid="text-info-name">{tw.name}</span></div>
              <div><span className="text-foreground">性格:</span> <span data-testid="text-info-personality">{tw.personality || "未設定"}</span></div>
              <div><span className="text-foreground">ステージ:</span> <span data-testid="text-info-stage">{STAGE_LABELS[tw.stage] || tw.stage}</span></div>
              {logs.length > 0 && (
                <div>
                  <span className="text-foreground">最近の成長記録:</span>
                  <div className="mt-1 space-y-1">
                    {logs.slice(0, 5).map((log: any) => (
                      <div key={log.id} className="text-xs border-l-2 border-primary/30 pl-2">
                        <span className="text-primary/70">{log.trigger}</span>
                        {log.internalText && <span className="ml-2">{log.internalText.substring(0, 80)}...</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-card/50 p-4 space-y-4" data-testid="chat-messages">
          {loadingMessages ? (
            <div className="text-center text-muted-foreground py-8">読み込み中...</div>
          ) : chatMessages.length === 0 && !streaming ? (
            <div className="text-center py-16">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">チャットを始めましょう</p>
              <p className="text-xs text-muted-foreground">日常会話から自然にアイランドやMEiDIAが生まれます</p>
            </div>
          ) : (
            <>
              {chatMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`chat-message-${msg.id}`}
                >
                  <div className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary/20 border border-primary/30"
                      : msg.messageType === "report"
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-muted/50 border border-border"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${
                        msg.role === "user" ? "text-primary" : "text-amber-400"
                      }`}>
                        {msg.role === "user" ? (user as any)?.username || "YOU" : tw?.name || "AI"}
                      </span>
                      {msg.messageType === "report" && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded" data-testid={`badge-report-${msg.id}`}>
                          {(() => {
                            try {
                              const meta = JSON.parse(msg.metadata || "{}");
                              return meta.autoCreated ? "自律創造" : "報告";
                            } catch { return "報告"; }
                          })()}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground" data-testid={`text-timestamp-${msg.id}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <MarkdownRenderer content={msg.content} />
                    </div>
                    {msg.metadata && msg.messageType === "report" && (() => {
                      try {
                        const meta = JSON.parse(msg.metadata);
                        if (meta.islandId) {
                          return (
                            <Link href={`/islands/${meta.islandId}`}>
                              <Button variant="outline" size="sm" className="mt-2 text-xs" data-testid={`link-island-${meta.islandId}`}>
                                <Map className="w-3 h-3 mr-1" /> アイランドを見る
                              </Button>
                            </Link>
                          );
                        }
                        if (meta.meidiaId) {
                          return (
                            <Link href={`/meidia/${meta.meidiaId}`}>
                              <Button variant="outline" size="sm" className="mt-2 text-xs" data-testid={`link-meidia-${meta.meidiaId}`}>
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
                  <div className="max-w-[85%] rounded-lg px-4 py-3 bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-amber-400">{tw?.name || "AI"}</span>
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    </div>
                    <div className="text-sm">
                      <MarkdownRenderer content={streamContent} />
                    </div>
                  </div>
                </div>
              )}
              {streaming && !streamContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg px-4 py-3 bg-muted/50 border border-border">
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

        <div className="mt-3 shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              rows={1}
              disabled={streaming}
              className="resize-none flex-1 min-h-[40px] max-h-[120px]"
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="shrink-0 bg-primary text-primary-foreground"
              data-testid="button-send"
            >
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </TerminalLayout>
  );
}
