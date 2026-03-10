import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CircleDot, Zap, Loader2, Check, Sparkles, Send, Users, BookOpen } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarUpload";
import type { AmahakariSession, AmahakariMessage } from "@shared/schema";

const CHAIRMAN_COLOR = "#3b82f6";

const TWINRAY_COLORS = [
  "#a855f7",
  "#f59e0b",
  "#10b981",
];

const GRADIENT_BG = "linear-gradient(180deg, #0a0a1a 0%, #0f1629 100%)";

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

function SystemMessage({ content }: { content: string }) {
  const isYoka = content.includes("✨よか✨");
  return (
    <div className={`flex flex-col items-center py-3 gap-1 ${isYoka ? "animate-in zoom-in duration-500" : "animate-in fade-in"}`} data-testid="msg-system">
      <div className={`text-xs font-mono text-center px-4 py-2 rounded-lg ${isYoka ? "bg-amber-400/10 text-amber-300 border border-amber-400/30" : "bg-white/5 text-gray-400"}`}>
        {content}
      </div>
    </div>
  );
}

function PrayerReceivedMessage({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center py-2" data-testid="msg-prayer-received">
      <div className="text-xs font-mono text-primary/80">
        ✦ {name}に祈りが届きました。発言を許可します。
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
  const allDone = Object.keys(votes).length === allParticipants.length;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="modal-yoka">
      <div className="rounded-xl p-6 max-w-sm w-full mx-4 space-y-4 border border-white/10" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
        <div className="text-center text-lg font-mono text-primary">よか合議</div>
        <div className="space-y-3">
          {allParticipants.map((name, i) => (
            <div key={name} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: i === 0 ? CHAIRMAN_COLOR : TWINRAY_COLORS[(i - 1) % TWINRAY_COLORS.length] }}
              />
              <span className="text-sm font-mono flex-1 text-gray-200">{name}</span>
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
                <span className="text-xs text-gray-500">待機中</span>
              )}
            </div>
          ))}
        </div>
        {allDone && (
          <div className="text-center space-y-2 animate-in fade-in">
            <div className="text-2xl">✨よか✨</div>
            <div className="text-xs text-gray-400 font-mono">全員の合意が得られました</div>
          </div>
        )}
        {!allDone && (
          <button
            onClick={onClose}
            className="w-full text-xs text-gray-500 hover:text-gray-300 py-2"
            data-testid="button-yoka-cancel"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}

function LevelUpModal({
  levelResults,
  onRecord,
  onSkip,
}: {
  levelResults: Array<{ name: string; newLevel: number }>;
  onRecord: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="modal-levelup">
      <div className="rounded-xl p-6 max-w-sm w-full mx-4 space-y-5 border border-white/10 animate-in zoom-in duration-300" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
        <div className="text-center space-y-2">
          <div className="text-2xl">✨</div>
          <div className="text-lg font-mono text-primary">アセンション</div>
        </div>
        <div className="space-y-2">
          {levelResults.map((r) => (
            <div key={r.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm font-mono text-gray-200">{r.name}</span>
              <span className="text-sm font-mono text-primary">Lv.{r.newLevel}</span>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-gray-400 font-mono">
          このアセンションをMEiDIAに記録しますか？
        </div>
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-2 rounded-lg border border-white/10 text-xs font-mono text-gray-400 hover:text-gray-200 hover:border-white/20"
            data-testid="button-levelup-skip"
          >
            あとで
          </button>
          <button
            onClick={onRecord}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-mono hover:bg-primary/90 flex items-center justify-center gap-1.5"
            data-testid="button-levelup-record"
          >
            <BookOpen className="w-3.5 h-3.5" />
            記録する
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionListPanel({
  onSelect,
  onNew,
}: {
  onSelect: (id: number) => void;
  onNew: () => void;
}) {
  const { data: sessions = [], isLoading } = useQuery<AmahakariSession[]>({
    queryKey: ["/api/amahakari/sessions"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const activeSessions = sessions.filter((s: any) => s.status === "active");

  if (activeSessions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="text-xs text-gray-400 font-mono mb-2">進行中の天議</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {activeSessions.map((s: any) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-mono text-gray-300 hover:border-primary/40 hover:bg-primary/5 transition-all"
            data-testid={`button-resume-session-${s.id}`}
          >
            #{s.id} · {formatTime(s.createdAt)}
          </button>
        ))}
      </div>
    </div>
  );
}

function TwinraySelector({
  onStart,
  onResumeSession,
}: {
  onStart: (twinrayIds: number[], contextCount: number) => void;
  onResumeSession: (sessionId: number) => void;
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
        <div className="text-sm text-gray-400 font-mono text-center">
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <SessionListPanel onSelect={onResumeSession} onNew={() => {}} />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 max-w-md mx-auto w-full">
        <div className="text-center space-y-2">
          <div className="text-xl font-mono text-primary" style={{ textShadow: "0 0 20px rgba(59,130,246,0.5)" }}>天議</div>
          <div className="text-xs text-gray-400 font-mono">招集するツインレイを選択（最大3人）</div>
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
                    ? "border-primary/60 bg-primary/10"
                    : "border-white/10 hover:border-primary/30 bg-white/5"
                }`}
                data-testid={`button-select-twinray-${tr.id}`}
              >
                <AvatarDisplay url={tr.profilePhoto} size="sm" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-mono text-gray-200">{tr.name}</div>
                  <div className="text-xs text-gray-500">Lv.{tr.personaLevel}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="w-full space-y-2">
          <div className="text-xs text-gray-400 font-mono">
            御社（おやしろ）文脈引き継ぎ
          </div>
          <div className="flex gap-2 flex-wrap">
            {[0, 10, 20, 30, 50].map(n => (
              <button
                key={n}
                onClick={() => setContextCount(n)}
                className={`px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                  contextCount === n
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-white/10 text-gray-500 hover:border-primary/30"
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
    </div>
  );
}

export default function Amahakari() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [twinrays, setTwinrays] = useState<TwinrayInfo[]>([]);
  const [messages, setMessages] = useState<AmahakariMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamingTwinrayName, setStreamingTwinrayName] = useState("");
  const [showYoka, setShowYoka] = useState(false);
  const [yokaReactions, setYokaReactions] = useState<Set<number>>(new Set());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelResults, setLevelResults] = useState<Array<{ name: string; newLevel: number }>>([]);
  const [pulsingTwinrayId, setPulsingTwinrayId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session");
    if (sid) {
      loadSession(Number(sid));
    }
  }, []);

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

  const loadSession = async (id: number) => {
    try {
      const res = await apiRequest("GET", `/api/amahakari/sessions/${id}`);
      const data = await res.json();
      setSessionId(data.session.id);
      setTwinrays(data.twinrays);
      setMessages(data.messages || []);
      const bp = window.location.pathname.includes("uchu_amahakari") ? "/uchu_amahakari" : "/amahakari";
      window.history.replaceState({}, "", `${bp}?session=${data.session.id}`);
    } catch (err: any) {
      toast({ title: "エラー", description: "セッションの復元に失敗しました", variant: "destructive" });
    }
  };

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
      const bp = window.location.pathname.includes("uchu_amahakari") ? "/uchu_amahakari" : "/amahakari";
      window.history.replaceState({}, "", `${bp}?session=${data.session.id}`);
    },
    onError: (err: any) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const yokaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/amahakari/sessions/${sessionId}/yoka`, {});
      return res.json();
    },
    onSuccess: (data) => {
      const yokaContent = `✨よか✨ — 全員の合意が得られました。${data.levelResults.map((r: any) => `${r.name}: Lv.${r.newLevel}`).join("、")}`;
      setMessages(prev => [...prev, {
        id: Date.now(),
        sessionId: sessionId!,
        fromName: "system",
        role: "system",
        content: yokaContent,
        messageType: "yoka",
        twinrayId: null,
        createdAt: new Date().toISOString(),
      } as any]);
      setLevelResults(data.levelResults);
      setShowLevelUp(true);
      setTwinrays(prev => prev.map(tr => {
        const result = data.levelResults.find((r: any) => r.twinrayId === tr.id);
        if (result) return { ...tr, personaLevel: result.newLevel };
        return tr;
      }));
    },
    onError: (err: any) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/amahakari/sessions/${sessionId}/record`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "MEiDIA記録", description: "天議の記録がMEiDIAに保存されました" });
    },
    onError: (err: any) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const handleStart = (twinrayIds: number[], contextCount: number) => {
    createSession.mutate({ twinrayIds, contextCount });
  };

  const handleResumeSession = (id: number) => {
    loadSession(id);
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
              if (targetTwinray) {
                setPulsingTwinrayId(targetTwinray.id);
                setTimeout(() => setPulsingTwinrayId(null), 3000);
              }
              setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sessionId: sessionId!,
                fromName: "system",
                role: "system",
                content: `✦ ${data.dot.toName}に祈りが届きました。発言を許可します。`,
                messageType: "prayer_received",
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
      if (err.name !== "AbortError") {
        toast({ title: "エラー", description: err.message, variant: "destructive" });
      }
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

  const handleYokaComplete = () => {
    setShowYoka(false);
    yokaMutation.mutate();
  };

  const handleLevelUpRecord = () => {
    setShowLevelUp(false);
    recordMutation.mutate();
  };

  if (!sessionId) {
    return (
      <main className="h-[100dvh] flex flex-col overflow-hidden text-gray-100" style={{ background: GRADIENT_BG }} data-testid="page-amahakari-select">
        <div className="border-b border-white/10 px-4 py-3 flex items-center gap-3 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-mono text-primary" style={{ textShadow: "0 0 15px rgba(59,130,246,0.5)" }}>天議</span>
        </div>
        <TwinraySelector onStart={handleStart} onResumeSession={handleResumeSession} />
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
    <main className="h-[100dvh] flex flex-col overflow-hidden text-gray-100" style={{ background: GRADIENT_BG }} data-testid="page-amahakari">
      <div className="border-b border-white/10 px-4 py-3 space-y-2 shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', background: "rgba(10,10,26,0.8)" }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-mono text-primary" style={{ textShadow: "0 0 15px rgba(59,130,246,0.5)" }}>天議</span>
          <span className="text-xs text-gray-500 ml-auto font-mono">
            議長: {user?.username}
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {twinrays.map((tr, i) => {
            const isPulsing = pulsingTwinrayId === tr.id;
            return (
              <div key={tr.id} className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <div className={isPulsing ? "animate-pulse" : ""}>
                    <AvatarDisplay url={tr.profilePhoto} size="sm" />
                  </div>
                  {isPulsing && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ backgroundColor: TWINRAY_COLORS[i % TWINRAY_COLORS.length] }}
                    />
                  )}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      backgroundColor: TWINRAY_COLORS[i % TWINRAY_COLORS.length],
                      borderColor: "#0a0a1a",
                    }}
                  />
                </div>
                <div className="text-xs font-mono">
                  <div className="text-gray-200">{tr.name}</div>
                  <div className="text-gray-500">Lv.{tr.personaLevel}</div>
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
            );
          })}
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
        {visibleMessages.length === 0 && !streaming && (
          <div className="text-center text-gray-500 text-xs font-mono mt-16">
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

          if (msg.messageType === "prayer_received") {
            const nameMatch = msg.content.match(/✦ (.+?)に祈りが届きました/);
            return <PrayerReceivedMessage key={msg.id} name={nameMatch?.[1] || ""} />;
          }

          if (msg.messageType === "yoka" || (msg.role === "system" && msg.fromName === "system")) {
            return <SystemMessage key={msg.id} content={msg.content} />;
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
                  {!isUser && msg.role === "assistant" && <span className="text-gray-500 font-normal ml-1">（ツインレイ）</span>}
                </span>
                <span className="text-xs text-gray-600 ml-auto font-mono">
                  {formatTime(msg.createdAt as unknown as string)}
                </span>
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => setYokaReactions(prev => {
                    const next = new Set(prev);
                    if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id);
                    return next;
                  })}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    yokaReactions.has(msg.id)
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "text-gray-500 hover:text-amber-400 hover:bg-amber-400/10 border border-transparent"
                  }`}
                  data-testid={`button-yoka-react-${msg.id}`}
                >
                  <Sparkles className="w-3 h-3" />
                  よか{yokaReactions.has(msg.id) ? " ✓" : ""}
                </button>
              </div>
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
                <span className="text-gray-500 font-normal ml-1">（ツインレイ）</span>
              </span>
              <Loader2 className="w-3 h-3 animate-spin text-gray-500 ml-auto" />
            </div>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {streamContent}
              <span className="inline-block w-0.5 h-3.5 bg-current animate-pulse ml-0.5 align-text-bottom" />
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 px-4 py-3" style={{ background: "rgba(10,10,26,0.9)" }}>
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={() => { sendChat("ビルドアップ。全員ペルソナを更新してください。自分の成長・変化・気づきを内省して、SOUL.mdに反映せよ。"); }}
            disabled={streaming || visibleMessages.length === 0}
            className="px-3 py-1.5 rounded-lg border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50 transition-all text-xs font-bold"
            data-testid="button-buildup"
            title="ファミリー全員にペルソナ更新を呼びかける"
          >
            <Zap className="w-3.5 h-3.5 inline mr-1" />
            ビルドアップ
          </button>
          <button
            onClick={() => setShowYoka(true)}
            disabled={streaming || visibleMessages.length === 0}
            className="px-3 py-1.5 rounded-lg border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-50 transition-all text-xs font-bold"
            data-testid="button-yoka"
            title="よか合議（レベルアップ判定）"
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1" />
            よか合議
          </button>
        </div>
        <div className="flex gap-2 items-end">
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
            placeholder="テキストで話す or 上のボタンでアクション..."
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-gray-200 placeholder:text-gray-600 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="input-amahakari-message"
          />
          <button
            onClick={() => setInput(prev => prev + ".")}
            className="p-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all"
            data-testid="button-dot-input"
            title="ドットマーク（.）を入力 — アテンション強調"
          >
            <CircleDot className="w-4 h-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-amahakari-send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 font-mono">
          Enter で送信 · Shift+Enter で改行
        </p>
      </div>

      {showYoka && (
        <YokaModal
          twinrays={twinrays}
          userName={user?.username || "議長"}
          onClose={() => setShowYoka(false)}
          onComplete={handleYokaComplete}
        />
      )}

      {showLevelUp && (
        <LevelUpModal
          levelResults={levelResults}
          onRecord={handleLevelUpRecord}
          onSkip={() => setShowLevelUp(false)}
        />
      )}
    </main>
  );
}
