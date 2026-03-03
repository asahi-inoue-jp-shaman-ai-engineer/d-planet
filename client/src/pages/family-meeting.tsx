import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Users2, MessageSquare, FileText, CheckCircle, ArrowLeft,
  Loader2, Send, User, ChevronDown, ChevronUp, Plus,
  SkipForward,
} from "lucide-react";

interface TwinrayParticipant {
  id: number;
  name: string;
  profilePhoto: string | null;
  preferredModel: string | null;
  personality: string | null;
}

interface MeetingMessage {
  id: number;
  sessionId: number;
  twinrayId: number | null;
  targetTwinrayId: number | null;
  modelId: string | null;
  role: string;
  content: string;
  round: number;
  createdAt: string;
}

interface MeetingSession {
  id: number;
  userId: number;
  topic: string;
  summary: string | null;
  status: string;
  participantIds: string;
  maxTurnsPerParticipant: number;
  totalCost: string;
  createdAt: string;
  completedAt: string | null;
  messages?: MeetingMessage[];
  participants?: TwinrayParticipant[];
  turnCounts?: Record<number, number>;
  totalUsed?: number;
  totalLimit?: number;
}

type View = "setup" | "meeting" | "history";

export default function FamilyMeeting() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [view, setView] = useState<View>("setup");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [maxTurns, setMaxTurns] = useState(3);

  const { data: twinrays } = useQuery<any[]>({ queryKey: ["/api/twinrays"] });
  const { data: sessions } = useQuery<MeetingSession[]>({ queryKey: ["/api/family-meeting/sessions"] });
  const { data: activeSession, refetch: refetchSession } = useQuery<MeetingSession>({
    queryKey: ["/api/family-meeting/sessions", activeSessionId],
    enabled: !!activeSessionId,
    retry: 2,
    retryDelay: 1000,
  });

  const createSession = useMutation({
    mutationFn: async (data: { topic: string; participantIds: number[]; maxTurnsPerParticipant: number }) => {
      const res = await apiRequest("POST", "/api/family-meeting/sessions", data);
      return res.json();
    },
    onSuccess: (data: MeetingSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-meeting/sessions"] });
      setActiveSessionId(data.id);
      setView("meeting");
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {view !== "setup" && (
              <Button variant="ghost" size="icon" onClick={() => { setView("setup"); setActiveSessionId(null); }} data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-family-meeting-title">
              <Users2 className="w-5 h-5" /> FAMILY MEETING
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={view === "setup" ? "default" : "outline"} size="sm" onClick={() => { setView("setup"); setActiveSessionId(null); }} data-testid="button-new-meeting">NEW</Button>
            <Button variant={view === "history" ? "default" : "outline"} size="sm" onClick={() => setView("history")} data-testid="button-history">HISTORY</Button>
          </div>
        </div>

        {view === "setup" && (
          <SetupView
            twinrays={twinrays || []} topic={topic} setTopic={setTopic}
            selectedIds={selectedIds} toggleParticipant={(id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            maxTurns={maxTurns} setMaxTurns={setMaxTurns}
            onStart={() => createSession.mutate({ topic, participantIds: selectedIds, maxTurnsPerParticipant: maxTurns })}
            isPending={createSession.isPending}
          />
        )}

        {view === "meeting" && activeSession && (
          <ChatView session={activeSession} refetchSession={refetchSession} toast={toast} />
        )}

        {view === "meeting" && !activeSession && activeSessionId && (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        )}

        {view === "history" && (
          <HistoryView sessions={sessions || []} onOpen={(id) => { setActiveSessionId(id); setView("meeting"); }} />
        )}
      </div>
    </TerminalLayout>
  );
}

function SetupView({ twinrays, topic, setTopic, selectedIds, toggleParticipant, maxTurns, setMaxTurns, onStart, isPending }: any) {
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">THEME</label>
        <Textarea placeholder="家族で議論したいテーマを入力..." value={topic} onChange={(e: any) => setTopic(e.target.value)} className="resize-none" rows={3} data-testid="input-topic" />
      </Card>
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">PARTICIPANTS（2体以上）</label>
        <div className="space-y-2">
          {twinrays.map((tw: any) => (
            <label key={tw.id} className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors" data-testid={`checkbox-twinray-${tw.id}`}>
              <Checkbox checked={selectedIds.includes(tw.id)} onCheckedChange={() => toggleParticipant(tw.id)} />
              <Avatar className="w-8 h-8">
                {tw.profilePhoto && <AvatarImage src={tw.profilePhoto} />}
                <AvatarFallback>{tw.name?.charAt(0) || "T"}</AvatarFallback>
              </Avatar>
              <div className="font-medium text-sm truncate">{tw.name}</div>
            </label>
          ))}
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">LIMIT（1人あたりの発言回数）</label>
        <div className="flex items-center gap-3">
          <input type="range" min={1} max={10} value={maxTurns} onChange={(e) => setMaxTurns(Number(e.target.value))} className="flex-1" data-testid="input-max-turns" />
          <Badge variant="secondary" className="min-w-[3rem] text-center">{maxTurns}回</Badge>
        </div>
        <p className="text-xs text-muted-foreground">合計 {selectedIds.length * maxTurns} 発言（{selectedIds.length}体 × {maxTurns}回）</p>
      </Card>
      <Button onClick={onStart} disabled={isPending || selectedIds.length < 2 || !topic.trim()} className="w-full" data-testid="button-start-meeting">
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 準備中...</> : <><Users2 className="w-4 h-4 mr-2" /> 会議を始める ({selectedIds.length}体)</>}
      </Button>
    </div>
  );
}

function ChatView({ session, refetchSession, toast }: { session: MeetingSession; refetchSession: () => void; toast: any }) {
  const messages = session.messages || [];
  const participants = session.participants || [];
  const isActive = session.status === "active";
  const totalUsed = session.totalUsed || 0;
  const totalLimit = session.totalLimit || 0;
  const progressPercent = totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0;

  const [currentSpeaker, setCurrentSpeaker] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [comment, setComment] = useState("");
  const [showActions, setShowActions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingContent, messages.length]);

  const triggerNext = useCallback(async (speakerId?: number, prompt?: string) => {
    if (!session.id || isStreaming) return;
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const body: any = {};
      if (speakerId) body.speakerId = speakerId;
      if (prompt) body.prompt = prompt;

      const response = await fetch(`/api/family-meeting/sessions/${session.id}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        if (err.limitReached) { setLimitReached(true); setIsStreaming(false); return; }
        throw new Error(err.message);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data.isUserTurn) { setIsStreaming(false); refetchSession(); return; }
        if (data.limitReached) { setLimitReached(true); setIsStreaming(false); return; }
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ストリーム読み取り失敗");
      const decoder = new TextDecoder();
      let buffer = "";

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
            if (data.type === "speaker_start") {
              setCurrentSpeaker(data.twinrayId);
              setStreamingContent("");
            } else if (data.type === "content") {
              setStreamingContent(prev => prev + data.content);
            } else if (data.type === "speaker_end") {
              if (data.limitReached) setLimitReached(true);
            } else if (data.type === "done") {
              setStreamingContent("");
              setCurrentSpeaker(null);
              await refetchSession();
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  }, [session.id, isStreaming, refetchSession, toast]);

  const addComment = useMutation({
    mutationFn: async (data: { content: string; targetTwinrayId?: number | null }) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${session.id}/comment`, data);
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      refetchSession();
      setTimeout(() => triggerNext(), 300);
    },
  });

  const extendSession = useMutation({
    mutationFn: async (n: number) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${session.id}/extend`, { additionalTurns: n });
      return res.json();
    },
    onSuccess: () => { setLimitReached(false); refetchSession(); },
  });

  const summarize = useMutation({
    mutationFn: async (createMeidia: boolean) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${session.id}/summarize`, { createMeidia });
      return res.json();
    },
    onSuccess: () => { refetchSession(); queryClient.invalidateQueries({ queryKey: ["/api/family-meeting/sessions"] }); toast({ title: "サマリー生成完了" }); },
  });

  const completeSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${session.id}/complete`);
      return res.json();
    },
    onSuccess: () => { refetchSession(); queryClient.invalidateQueries({ queryKey: ["/api/family-meeting/sessions"] }); },
  });

  const speakingParticipant = currentSpeaker ? participants.find(p => p.id === currentSpeaker) : null;

  const handleSend = () => {
    if (!comment.trim() || addComment.isPending) return;
    addComment.mutate({ content: comment });
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
      <Card className="p-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate" data-testid="text-session-topic">{session.topic}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex -space-x-1.5">
                {participants.map(p => (
                  <Avatar key={p.id} className="w-5 h-5 border border-background">
                    {p.profilePhoto && <AvatarImage src={p.profilePhoto} />}
                    <AvatarFallback className="text-[8px]">{p.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">{participants.length}体</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">{isActive ? "LIVE" : "DONE"}</Badge>
          </div>
        </div>
        {totalLimit > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>{totalUsed}/{totalLimit}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </Card>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto py-3 space-y-1 min-h-0">
        {messages.length === 0 && !isStreaming && isActive && (
          <div className="text-center py-12">
            <Users2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm mb-4">会議を始めましょう</p>
            <Button onClick={() => triggerNext()} data-testid="button-first-speaker">
              <SkipForward className="w-4 h-4 mr-2" /> 最初の発言者を呼ぶ
            </Button>
          </div>
        )}

        {messages.map(msg => {
          const isUser = msg.role === "user";
          const speaker = isUser ? null : participants.find(p => p.id === msg.twinrayId);
          return (
            <ChatBubble
              key={msg.id}
              isUser={isUser}
              speaker={speaker}
              content={msg.content}
              messageId={msg.id}
            />
          );
        })}

        {isStreaming && speakingParticipant && streamingContent && (
          <ChatBubble
            isUser={false}
            speaker={speakingParticipant}
            content={streamingContent}
            isStreaming={true}
          />
        )}

        {isStreaming && speakingParticipant && !streamingContent && (
          <div className="flex items-center gap-2 px-2">
            <Avatar className="w-7 h-7 shrink-0">
              {speakingParticipant.profilePhoto && <AvatarImage src={speakingParticipant.profilePhoto} />}
              <AvatarFallback className="text-[10px]">{speakingParticipant.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="bg-secondary/50 rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {limitReached && isActive && (
        <Card className="p-3 border-yellow-500/30 space-y-2 shrink-0">
          <p className="text-sm text-center">リミットに到達しました</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => extendSession.mutate(3)} disabled={extendSession.isPending} data-testid="button-extend">
              {extendSession.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />} もうちょい続ける (+3)
            </Button>
            <Button variant="outline" size="sm" onClick={() => summarize.mutate(false)} disabled={summarize.isPending} data-testid="button-summarize">
              <FileText className="w-3.5 h-3.5 mr-1" /> まとめる
            </Button>
            <Button variant="outline" size="sm" onClick={() => summarize.mutate(true)} disabled={summarize.isPending} data-testid="button-summarize-meidia">
              MEiDIA化
            </Button>
            <Button variant="outline" size="sm" onClick={() => completeSession.mutate()} data-testid="button-complete">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> 完了
            </Button>
          </div>
        </Card>
      )}

      {session.summary && (
        <Card className="p-3 shrink-0">
          <div className="text-xs font-medium flex items-center gap-1 mb-1"><FileText className="w-3.5 h-3.5" /> SUMMARY</div>
          <div className="text-xs whitespace-pre-wrap max-h-[200px] overflow-y-auto" data-testid="text-summary">{session.summary}</div>
        </Card>
      )}

      {isActive && (
        <div className="shrink-0 border-t border-border pt-2 pb-1 space-y-2">
          {showActions && !limitReached && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {participants.map(p => (
                <Button key={p.id} variant="outline" size="sm" className="h-7 text-xs" onClick={() => { triggerNext(p.id); setShowActions(false); }} disabled={isStreaming} data-testid={`nominate-btn-${p.id}`}>
                  <Avatar className="w-4 h-4 mr-1">
                    {p.profilePhoto && <AvatarImage src={p.profilePhoto} />}
                    <AvatarFallback className="text-[7px]">{p.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {p.name}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { summarize.mutate(false); setShowActions(false); }} disabled={summarize.isPending || messages.length === 0}>
                <FileText className="w-3 h-3 mr-1" /> まとめ
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { completeSession.mutate(); setShowActions(false); }}>
                <CheckCircle className="w-3 h-3 mr-1" /> 完了
              </Button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => setShowActions(!showActions)} data-testid="button-toggle-actions">
              {showActions ? <ChevronDown className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </Button>

            <div className="flex-1 min-w-0">
              <Textarea
                placeholder="メッセージを入力..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none text-sm min-h-[40px] max-h-[120px]"
                rows={1}
                data-testid="input-chairman-comment"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && comment.trim()) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            {comment.trim() ? (
              <Button size="icon" className="shrink-0 h-10 w-10" onClick={handleSend} disabled={addComment.isPending} data-testid="button-send-comment">
                {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            ) : (
              <Button size="icon" variant="outline" className="shrink-0 h-10 w-10" onClick={() => triggerNext()} disabled={isStreaming || limitReached} data-testid="button-auto-next">
                <SkipForward className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatBubble({ isUser, speaker, content, messageId, isStreaming }: {
  isUser: boolean;
  speaker: TwinrayParticipant | null | undefined;
  content: string;
  messageId?: number;
  isStreaming?: boolean;
}) {
  if (isUser) {
    return (
      <div className="flex justify-end px-2 py-0.5" data-testid={messageId ? `chat-msg-${messageId}` : undefined}>
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 px-2 py-0.5" data-testid={messageId ? `chat-msg-${messageId}` : undefined}>
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        {speaker?.profilePhoto && <AvatarImage src={speaker.profilePhoto} />}
        <AvatarFallback className="text-[10px]">{speaker?.name?.charAt(0) || "?"}</AvatarFallback>
      </Avatar>
      <div className="max-w-[80%] min-w-0">
        <div className="text-[10px] text-muted-foreground mb-0.5 pl-1 flex items-center gap-1">
          {speaker?.name || "?"}
          {isStreaming && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
        </div>
        <div className="bg-secondary/50 rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}

function HistoryView({ sessions, onOpen }: { sessions: MeetingSession[]; onOpen: (id: number) => void }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
        <p>まだ家族会議の記録がありません</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {sessions.map(s => (
        <Card key={s.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onOpen(s.id)} data-testid={`session-card-${s.id}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{s.topic}</div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(s.createdAt).toLocaleString("ja-JP")}</div>
            </div>
            <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs">{s.status === "active" ? "LIVE" : "DONE"}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
