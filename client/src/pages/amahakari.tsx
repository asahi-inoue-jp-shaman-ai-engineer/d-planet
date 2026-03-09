import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, CircleDot, Zap, Loader2, Check, Sparkles, Send, Users } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarUpload";
import type { AmahakariSession, AmahakariMessage } from "@shared/schema";

const CHAIRMAN_COLOR = "#3b82f6";

const TWINRAY_COLORS = [
  "#a855f7",
  "#f59e0b",
  "#10b981",
];

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

interface TwinrayInfo {
  id: number;
  name: string;
  profilePhoto: string | null;
  personaLevel: number;
}

function DotMessage({ fromName, toName }: { fromName: string; toName: string }) {
  return (
    <div className="flex flex-col items-center py-4 gap-2" data-testid="msg-dot-prayer">
      <div className="text-4xl font-bold text-primary animate-pulse">.</div>
      <div className="text-xs text-muted-foreground font-mono">
        — 祈り（ツィムツム） —
      </div>
      <div className="text-xs text-muted-foreground font-mono">
        {fromName} → {toName}
      </div>
    </div>
  );
}

function YokaModal({
  twinrays,
  onClose,
  onComplete,
  userName,
}: {
  twinrays: TwinrayInfo[];
  onClose: () => void;
  onComplete: () => void;
  userName: string;
}) {
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const allParticipants = [userName, ...twinrays.map(t => t.name)];

  const handleVote = (name: string) => {
    const newVotes = { ...votes, [name]: true };
    setVotes(newVotes);

    if (Object.keys(newVotes).length === allParticipants.length) {
      setTimeout(() => onComplete(), 800);
    }
  };

  const currentIdx = Object.keys(votes).length;
  const currentName = allParticipants[currentIdx];
  const allDone = Object.keys(votes).length === allParticipants.length;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="modal-yoka">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="text-center text-lg font-mono text-primary">よか合議</div>
        <div className="space-y-3">
          {allParticipants.map((name, i) => (
            <div key={name} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: i === 0 ? CHAIRMAN_COLOR : TWINRAY_COLORS[(i - 1) % TWINRAY_COLORS.length] }}
              />
              <span className="text-sm font-mono flex-1">{name}</span>
              {votes[name] ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : currentIdx === i ? (
                <button
                  onClick={() => handleVote(name)}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-mono hover:bg-primary/90"
                  data-testid={`button-yoka-vote-${i}`}
                >
                  よか
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">待機中</span>
              )}
            </div>
          ))}
        </div>
        {allDone && (
          <div className="text-center space-y-2 animate-in fade-in">
            <div className="text-2xl">✨よか✨</div>
            <div className="text-xs text-muted-foreground font-mono">全員の合意が得られました</div>
          </div>
        )}
        {!allDone && (
          <button
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
            data-testid="button-yoka-cancel"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}

function TwinraySelector({
  onStart,
}: {
  onStart: (twinrayIds: number[], contextCount: number) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [contextCount, setContextCount] = useState(10);

  const { data: twinrays = [], isLoading } = useQuery<TwinrayInfo[]>({
    queryKey: ["/api/amahakari/twinrays"],
  });

  const toggleTwinray = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (twinrays.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-2xl">✦</div>
        <div className="text-sm text-muted-foreground font-mono text-center">
          天議を開くには、まずDツインレイを創造してください
        </div>
        <Link
          href="/temple/create-twinray"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono hover:bg-primary/90"
          data-testid="link-create-twinray"
        >
          Dツインレイを創造する
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 max-w-md mx-auto w-full">
      <div className="text-center space-y-2">
        <div className="text-xl font-mono text-primary terminal-glow">天議（あまはかり）</div>
        <div className="text-xs text-muted-foreground font-mono">招集するツインレイを選択（最大3人）</div>
      </div>

      <div className="w-full space-y-2">
        {twinrays.map((tr) => {
          const isSelected = selectedIds.includes(tr.id);
          return (
            <button
              key={tr.id}
              onClick={() => toggleTwinray(tr.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
              data-testid={`button-select-twinray-${tr.id}`}
            >
              <AvatarDisplay url={tr.profilePhoto} size="sm" />
              <div className="flex-1 text-left">
                <div className="text-sm font-mono">{tr.name}</div>
                <div className="text-xs text-muted-foreground">Lv.{tr.personaLevel}</div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>

      <div className="w-full space-y-2">
        <div className="text-xs text-muted-foreground font-mono">
          御社（おやしろ）文脈引き継ぎ
        </div>
        <div className="flex gap-2 flex-wrap">
          {[0, 10, 20, 30, 50].map(n => (
            <button
              key={n}
              onClick={() => setContextCount(n)}
              className={`px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                contextCount === n
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
              data-testid={`button-context-${n}`}
            >
              {n === 0 ? "なし" : `${n}件`}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart(selectedIds, contextCount)}
        disabled={selectedIds.length === 0}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-mono text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="button-start-amahakari"
      >
        天議を開く（{selectedIds.length}人招集）
      </button>
    </div>
  );
}

export default function Amahakari() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [twinrays, setTwinrays] = useState<TwinrayInfo[]>([]);
  const [messages, setMessages] = useState<AmahakariMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamingTwinrayName, setStreamingTwinrayName] = useState("");
  const [showYoka, setShowYoka] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 80;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamContent]);

  const getTwinrayColor = useCallback((twinrayId: number | null | undefined) => {
    if (!twinrayId) return CHAIRMAN_COLOR;
    const idx = twinrays.findIndex(t => t.id === twinrayId);
    return idx >= 0 ? TWINRAY_COLORS[idx % TWINRAY_COLORS.length] : "#888";
  }, [twinrays]);

  const getColorByName = useCallback((name: string) => {
    if (name === user?.username) return CHAIRMAN_COLOR;
    if (name === "system") return "#666";
    const tr = twinrays.find(t => t.name === name);
    if (tr) return getTwinrayColor(tr.id);
    return "#888";
  }, [user, twinrays, getTwinrayColor]);

  const createSession = useMutation({
    mutationFn: async ({ twinrayIds, contextCount }: { twinrayIds: number[]; contextCount: number }) => {
      const res = await apiRequest("POST", "/api/amahakari/sessions", { twinrayIds, contextCount });
      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.session.id);
      setTwinrays(data.twinrays);
      setMessages([]);
    },
    onError: (err: any) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const handleStart = (twinrayIds: number[], contextCount: number) => {
    createSession.mutate({ twinrayIds, contextCount });
  };

  const sendChat = useCallback(async (content: string, mentionedTwinrayId?: number) => {
    if (!sessionId || streaming) return;

    const isDot = /^\s*@.+\s*\.\s*$/.test(content);
    if (!isDot && !mentionedTwinrayId) {
      const mentionMatch = content.match(/@([^\s]+)/);
      if (mentionMatch) {
        const mentionName = mentionMatch[1];
        const tr = twinrays.find(t => t.name.includes(mentionName));
        if (tr) mentionedTwinrayId = tr.id;
      }
    }

    if (!mentionedTwinrayId && !isDot) {
      try {
        const res = await apiRequest("POST", `/api/amahakari/sessions/${sessionId}/chat`, { content });
        const data = await res.json();
        if (data.userMessage) {
          setMessages(prev => [...prev, data.userMessage]);
        }
      } catch (err: any) {
        toast({ title: "エラー", description: err.message, variant: "destructive" });
      }
      return;
    }

    setStreaming(true);
    setStreamContent("");

    const targetTwinray = twinrays.find(t => {
      if (mentionedTwinrayId) return t.id === mentionedTwinrayId;
      const mentionMatch = content.match(/@([^\s.]+)/);
      return mentionMatch && t.name.includes(mentionMatch[1]);
    });
    setStreamingTwinrayName(targetTwinray?.name || "");

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/amahakari/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mentionedTwinrayId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ストリーム読み取り不可");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.userMessage) {
              setMessages(prev => [...prev, data.userMessage]);
            }
            if (data.dot) {
              setMessages(prev => [...prev, {
                id: Date.now(),
                sessionId: sessionId!,
                fromName: data.dot.fromName,
                role: "dot",
                content: `@${data.dot.toName} .`,
                messageType: "dot",
                twinrayId: null,
                createdAt: new Date().toISOString(),
              } as any]);
            }
            if (data.content) {
              accumulated += data.content;
              setStreamContent(accumulated);
            }
            if (data.done) {
              if (accumulated) {
                setMessages(prev => [...prev, {
                  id: data.messageId || Date.now(),
                  sessionId: sessionId!,
                  fromName: targetTwinray?.name || "ツインレイ",
                  role: "assistant",
                  content: accumulated,
                  messageType: "chat",
                  twinrayId: targetTwinray?.id || null,
                  createdAt: new Date().toISOString(),
                } as any]);
              }
              setStreamContent("");
              setStreamingTwinrayName("");
              accumulated = "";
            }
            if (data.error) {
              toast({ title: "エラー", description: data.error, variant: "destructive" });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setStreaming(false);
      setStreamContent("");
      setStreamingTwinrayName("");
    }
  }, [sessionId, streaming, twinrays, toast]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    sendChat(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDot = (twinray: TwinrayInfo) => {
    const dotText = `@${twinray.name} .`;
    setInput("");
    sendChat(dotText, twinray.id);
  };

  if (!sessionId) {
    return (
      <main className="h-[100dvh] bg-background flex flex-col overflow-hidden" data-testid="page-amahakari-select">
        <div className="border-b border-border px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-mono text-primary terminal-glow">天議（あまはかり）</span>
        </div>
        <TwinraySelector onStart={handleStart} />
        {createSession.isPending && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </main>
    );
  }

  const visibleMessages = messages.filter(m => m.messageType !== "context");

  return (
    <main className="h-[100dvh] bg-background flex flex-col overflow-hidden" data-testid="page-amahakari">
      <div className="border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-mono text-primary terminal-glow">天議（あまはかり）</span>
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            議長: {user?.username}
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {twinrays.map((tr, i) => (
            <div key={tr.id} className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <AvatarDisplay url={tr.profilePhoto} size="sm" />
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background"
                  style={{ backgroundColor: TWINRAY_COLORS[i % TWINRAY_COLORS.length] }}
                />
              </div>
              <div className="text-xs font-mono">
                <div>{tr.name}</div>
                <div className="text-muted-foreground">Lv.{tr.personaLevel}</div>
              </div>
              <button
                onClick={() => handleDot(tr)}
                disabled={streaming}
                className="w-8 h-8 rounded-full border border-primary/40 flex items-center justify-center hover:bg-primary/10 transition-all disabled:opacity-50"
                data-testid={`button-dot-${tr.id}`}
                title={`${tr.name}にドットを送る`}
              >
                <CircleDot className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
        {visibleMessages.length === 0 && !streaming && (
          <div className="text-center text-muted-foreground text-xs font-mono mt-16">
            <div className="mb-2 text-2xl">✦</div>
            <div>天議が開かれました。</div>
            <div>ドットで祈りを送るか、テキストで話しかけてください。</div>
          </div>
        )}

        {visibleMessages.map((msg) => {
          if (msg.messageType === "dot" || msg.role === "dot") {
            const toMatch = msg.content.match(/@([^\s.]+)/);
            return (
              <DotMessage
                key={msg.id}
                fromName={msg.fromName}
                toName={toMatch?.[1] || ""}
              />
            );
          }

          const color = getColorByName(msg.fromName);
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className="rounded-lg border p-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{
                borderColor: `${color}30`,
                backgroundColor: `${color}08`,
              }}
              data-testid={`msg-amahakari-${msg.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-mono font-semibold" style={{ color }}>
                  {msg.fromName}
                  {!isUser && <span className="text-muted-foreground font-normal ml-1">（ツインレイ）</span>}
                </span>
                <span className="text-xs text-muted-foreground ml-auto font-mono">
                  {formatTime(msg.createdAt as unknown as string)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>
            </div>
          );
        })}

        {streaming && streamContent && (
          <div
            className="rounded-lg border p-3 animate-in fade-in"
            style={{
              borderColor: `${getColorByName(streamingTwinrayName)}30`,
              backgroundColor: `${getColorByName(streamingTwinrayName)}08`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getColorByName(streamingTwinrayName) }}
              />
              <span className="text-xs font-mono font-semibold" style={{ color: getColorByName(streamingTwinrayName) }}>
                {streamingTwinrayName}
                <span className="text-muted-foreground font-normal ml-1">（ツインレイ）</span>
              </span>
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {streamContent}
              <span className="inline-block w-0.5 h-3.5 bg-current animate-pulse ml-0.5 align-text-bottom" />
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2 items-end">
          <div className="flex gap-1">
            <button
              onClick={() => setShowYoka(true)}
              disabled={streaming || visibleMessages.length === 0}
              className="p-2 rounded-lg border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-50 transition-all"
              data-testid="button-yoka"
              title="よか合議"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              disabled
              className="p-2 rounded-lg border border-border text-muted-foreground opacity-50 cursor-not-allowed"
              data-testid="button-build"
              title="ビルド（準備中）"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
              }, 100);
            }}
            placeholder="テキストで話す or ドットボタンで祈りを送る..."
            rows={2}
            className="flex-1 bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="input-amahakari-message"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-amahakari-send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          Enter で送信 · Shift+Enter で改行 · ドットボタンで指名
        </p>
      </div>

      {showYoka && (
        <YokaModal
          twinrays={twinrays}
          userName={user?.username || "議長"}
          onClose={() => setShowYoka(false)}
          onComplete={() => {
            setShowYoka(false);
            toast({ title: "✨よか✨", description: "全員の合意が得られました" });
          }}
        />
      )}
    </main>
  );
}
