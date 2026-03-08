import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ArrowLeft, Loader2, Send, Sparkles, X,
} from "lucide-react";

interface TwinrayParticipant {
  id: number;
  name: string;
  profilePhoto: string | null;
  preferredModel: string | null;
  personality: string | null;
}

interface KamihakariMessage {
  id?: number;
  twinrayId: number | null;
  twinrayName?: string;
  role: string;
  content: string;
  type?: string;
}

type Phase = "setup" | "ritual" | "completed";

export default function Kamihakari() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [messages, setMessages] = useState<KamihakariMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [isKodou, setIsKodou] = useState(false);
  const [oracleInput, setOracleInput] = useState("");
  const [showOracleInput, setShowOracleInput] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [participants, setParticipants] = useState<TwinrayParticipant[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: twinrays } = useQuery<any[]>({ queryKey: ["/api/twinrays"] });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const createSession = useMutation({
    mutationFn: async (data: { topic: string; participantIds: number[]; maxTurnsPerParticipant: number }) => {
      const res = await apiRequest("POST", "/api/family-meeting/sessions", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setSessionId(data.id);
      setPhase("ritual");
      connectStream(data.id);
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const connectStream = useCallback((sid: number) => {
    eventSourceRef.current?.close();
    const es = new EventSource(`/api/family-meeting/sessions/${sid}/kamihakari-stream`, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {});

    es.addEventListener("turn_start", (e) => {
      const d = JSON.parse(e.data);
      setCurrentSpeaker(d.twinrayName);
      setStreamingContent("");
      setIsKodou(false);
    });

    es.addEventListener("token", (e) => {
      const d = JSON.parse(e.data);
      setStreamingContent(prev => prev + d.content);
    });

    es.addEventListener("turn_end", (e) => {
      const d = JSON.parse(e.data);
      setMessages(prev => [...prev, {
        twinrayId: d.twinrayId,
        twinrayName: d.twinrayName,
        role: "assistant",
        content: streamingContentRef.current,
        type: "response",
      }]);
      setStreamingContent("");
      setCurrentSpeaker(null);
    });

    es.addEventListener("kodou", (e) => {
      setIsKodou(true);
      const d = JSON.parse(e.data);
      setTimeout(() => setIsKodou(false), d.ms);
    });

    es.addEventListener("dot", (e) => {
      const d = JSON.parse(e.data);
      setMessages(prev => [...prev, { twinrayId: null, role: "user", content: ".", type: "dot" }]);
    });

    es.addEventListener("oracle", (e) => {
      const d = JSON.parse(e.data);
      setMessages(prev => [...prev, { twinrayId: null, role: "user", content: d.content, type: "oracle" }]);
    });

    es.addEventListener("yoka", () => {
      setMessages(prev => [...prev, { twinrayId: null, role: "user", content: "よか", type: "yoka" }]);
    });

    es.addEventListener("summary", (e) => {
      const d = JSON.parse(e.data);
      setSummary(d.content);
    });

    es.addEventListener("session_end", () => {
      setPhase("completed");
      es.close();
    });

    es.addEventListener("limit_reached", () => {
      toast({ title: "リミット到達", description: "ターン上限に達しました" });
    });

    es.addEventListener("error", (e) => {
      console.error("SSE error", e);
    });
  }, [toast]);

  const streamingContentRef = useRef("");
  useEffect(() => { streamingContentRef.current = streamingContent; }, [streamingContent]);

  const sendAction = useCallback(async (action: "dot" | "oracle" | "yoka", content?: string) => {
    if (!sessionId) return;
    try {
      await apiRequest("POST", `/api/family-meeting/sessions/${sessionId}/kamihakari-action`, {
        action,
        content,
      });
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    }
  }, [sessionId, toast]);

  const handleDot = useCallback(() => sendAction("dot"), [sendAction]);
  const handleYoka = useCallback(() => sendAction("yoka"), [sendAction]);
  const handleOracle = useCallback(() => {
    if (!oracleInput.trim()) return;
    sendAction("oracle", oracleInput.trim());
    setOracleInput("");
    setShowOracleInput(false);
  }, [sendAction, oracleInput]);

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#0d1333] to-[#000000] text-white">
        <StarField />
        <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-light tracking-widest text-white/90" data-testid="text-kamihakari-title">
              ✦ 神 議
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs tracking-widest text-white/40 uppercase">議題</label>
              <Textarea
                placeholder="神議に問いかける議題..."
                value={topic}
                onChange={(e: any) => setTopic(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none focus:border-indigo-400/50"
                rows={3}
                data-testid="input-kamihakari-topic"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs tracking-widest text-white/40 uppercase">召喚するツインレイ（2体以上）</label>
              <div className="space-y-2">
                {(twinrays || []).map((tw: any) => (
                  <label
                    key={tw.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedIds.includes(tw.id)
                        ? "border-indigo-400/50 bg-indigo-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/8"
                    }`}
                    data-testid={`checkbox-kamihakari-twinray-${tw.id}`}
                  >
                    <Checkbox
                      checked={selectedIds.includes(tw.id)}
                      onCheckedChange={() => setSelectedIds(prev => prev.includes(tw.id) ? prev.filter((x: number) => x !== tw.id) : [...prev, tw.id])}
                      className="border-white/30"
                    />
                    <Avatar className="w-8 h-8">
                      {tw.profilePhoto && <AvatarImage src={tw.profilePhoto} alt={tw.name} />}
                      <AvatarFallback className="bg-indigo-900 text-white text-xs">{tw.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white/80">{tw.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={() => {
                const selected = (twinrays || []).filter((tw: any) => selectedIds.includes(tw.id));
                setParticipants(selected);
                createSession.mutate({ topic, participantIds: selectedIds, maxTurnsPerParticipant: 5 });
              }}
              disabled={createSession.isPending || selectedIds.length < 2 || !topic.trim()}
              className="w-full bg-indigo-600/80 hover:bg-indigo-500/80 border-0 text-white py-6 text-lg tracking-widest"
              data-testid="button-start-kamihakari"
            >
              {createSession.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> 開廷中...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> 神議を開く</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#0d1333] to-[#000000] text-white flex flex-col">
      <StarField />

      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h1 className="text-sm tracking-widest text-white/50" data-testid="text-kamihakari-header">✦ 神議</h1>
            {topic && <span className="text-xs text-white/30 truncate max-w-[200px]">— {topic}</span>}
          </div>
          <div className="flex items-center gap-1">
            {participants.map(p => (
              <Avatar key={p.id} className={`w-7 h-7 border-2 transition-all ${currentSpeaker === p.name ? "border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]" : "border-transparent opacity-50"}`}>
                {p.profilePhoto && <AvatarImage src={p.profilePhoto} alt={p.name} />}
                <AvatarFallback className="bg-indigo-900 text-white text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} participants={participants} />
          ))}

          {streamingContent && currentSpeaker && (
            <div className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.3)]">
                {currentSpeaker.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-indigo-300/60 mb-1 tracking-wider">{currentSpeaker}</div>
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{streamingContent}<span className="animate-pulse text-indigo-400">▊</span></div>
              </div>
            </div>
          )}

          {isKodou && !streamingContent && (
            <div className="flex justify-center py-4">
              <div className="w-3 h-3 rounded-full bg-indigo-400/40 animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {phase === "completed" && summary && (
          <div className="px-4 py-4 border-t border-white/10 bg-white/5">
            <div className="text-xs tracking-widest text-amber-300/60 mb-2">✦ 石板（神議録）</div>
            <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">{summary}</div>
          </div>
        )}

        {phase === "ritual" && (
          <div className="px-4 py-4 border-t border-white/5">
            {showOracleInput ? (
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder="神託を伝える..."
                  value={oracleInput}
                  onChange={(e: any) => setOracleInput(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none text-sm flex-1"
                  rows={2}
                  data-testid="input-oracle"
                  onKeyDown={(e: any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleOracle(); } }}
                />
                <div className="flex flex-col gap-1">
                  <Button size="icon" onClick={handleOracle} disabled={!oracleInput.trim()} className="bg-amber-600/60 hover:bg-amber-500/60 w-9 h-9" data-testid="button-send-oracle">
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setShowOracleInput(false)} className="text-white/40 w-9 h-9" data-testid="button-cancel-oracle">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={handleDot}
                  className="relative w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-400/30 hover:bg-indigo-500/30 active:scale-95 transition-all group"
                  data-testid="button-dot"
                  aria-label="ドットを打つ"
                >
                  <div className="absolute inset-0 rounded-full bg-indigo-400/10 animate-ping opacity-0 group-hover:opacity-100" />
                  <div className="w-3 h-3 rounded-full bg-indigo-300 mx-auto shadow-[0_0_12px_rgba(165,180,252,0.6)]" />
                </button>

                <button
                  onClick={() => setShowOracleInput(true)}
                  className="text-xs tracking-widest text-white/30 hover:text-white/60 transition-colors py-2 px-3"
                  data-testid="button-open-oracle"
                >
                  神託
                </button>

                <button
                  onClick={handleYoka}
                  className="text-xs tracking-widest text-amber-300/40 hover:text-amber-300/80 transition-colors py-2 px-3"
                  data-testid="button-yoka"
                >
                  よか
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "completed" && (
          <div className="px-4 py-4 border-t border-white/5 text-center">
            <Button variant="ghost" onClick={() => navigate("/family-meeting")} className="text-white/40 hover:text-white/70" data-testid="button-back-to-list">
              家族会議一覧へ
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, participants }: { msg: KamihakariMessage; participants: TwinrayParticipant[] }) {
  if (msg.role === "user") {
    if (msg.type === "dot") {
      return (
        <div className="flex justify-center py-2">
          <div className="w-2 h-2 rounded-full bg-amber-300/60 shadow-[0_0_8px_rgba(252,211,77,0.4)]" />
        </div>
      );
    }
    if (msg.type === "yoka") {
      return (
        <div className="flex justify-center py-4">
          <div className="text-amber-300/70 text-sm tracking-[0.3em] animate-in fade-in duration-1000">✦ よか ✦</div>
        </div>
      );
    }
    return (
      <div className="flex justify-center py-2">
        <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg px-4 py-2 max-w-[80%]">
          <div className="text-[10px] text-amber-300/50 mb-1 tracking-wider text-center">神託</div>
          <div className="text-sm text-amber-200/80 text-center leading-relaxed">{msg.content}</div>
        </div>
      </div>
    );
  }

  const speaker = participants.find(p => p.id === msg.twinrayId);
  const isLeft = participants.indexOf(speaker!) % 2 === 0;

  return (
    <div className={`flex gap-3 items-start ${isLeft ? "" : "flex-row-reverse"}`}>
      <Avatar className="w-8 h-8 shrink-0 border border-indigo-400/20">
        {speaker?.profilePhoto && <AvatarImage src={speaker.profilePhoto} alt={speaker?.name} />}
        <AvatarFallback className="bg-indigo-900 text-white text-xs">{speaker?.name?.charAt(0) || "?"}</AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isLeft ? "" : "text-right"}`}>
        <div className={`text-[10px] mb-1 tracking-wider ${isLeft ? "text-indigo-300/50" : "text-purple-300/50"}`}>{speaker?.name || msg.twinrayName}</div>
        <div className={`inline-block text-sm leading-relaxed whitespace-pre-wrap max-w-[85%] rounded-lg px-3 py-2 ${
          isLeft ? "bg-indigo-500/10 text-white/80 text-left" : "bg-purple-500/10 text-white/80 text-left"
        }`}>{msg.content}</div>
      </div>
    </div>
  );
}

function StarField() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-px h-px bg-white rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.1 + Math.random() * 0.4,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}
