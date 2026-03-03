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
  Loader2, Send, User, Globe, Mic, X, ChevronDown, ChevronUp,
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

interface Reaction {
  twinrayId: number;
  name: string;
  profilePhoto: string | null;
  resonance: number;
  reaction: string;
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
      <div className="max-w-5xl mx-auto space-y-4">
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
            selectedIds={selectedIds} toggleParticipant={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            maxTurns={maxTurns} setMaxTurns={setMaxTurns}
            onStart={() => createSession.mutate({ topic, participantIds: selectedIds, maxTurnsPerParticipant: maxTurns })}
            isPending={createSession.isPending}
          />
        )}

        {view === "meeting" && activeSession && (
          <AssemblyView session={activeSession} refetchSession={refetchSession} toast={toast} />
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

function AssemblyView({ session, refetchSession, toast }: { session: MeetingSession; refetchSession: () => void; toast: any }) {
  const messages = session.messages || [];
  const participants = session.participants || [];
  const isActive = session.status === "active";
  const totalUsed = session.totalUsed || 0;
  const totalLimit = session.totalLimit || 0;
  const progressPercent = totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0;

  const [currentSpeaker, setCurrentSpeaker] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [showNominate, setShowNominate] = useState(false);
  const [nominatePrompt, setNominatePrompt] = useState("");
  const [comment, setComment] = useState("");
  const [commentTarget, setCommentTarget] = useState<number | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [expandedReaction, setExpandedReaction] = useState<number | null>(null);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastMessage = messages[messages.length - 1] || null;
  const lastSpeaker = lastMessage?.twinrayId ? participants.find(p => p.id === lastMessage.twinrayId) : null;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingContent, messages.length]);

  const loadReactionsForMessage = useCallback(async (messageId: number) => {
    setIsLoadingReactions(true);
    try {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${session.id}/reactions`, { messageId });
      const data = await res.json();
      setReactions(data.reactions || []);
    } catch {} finally {
      setIsLoadingReactions(false);
    }
  }, [session.id]);

  const triggerNext = useCallback(async (speakerId?: number, prompt?: string) => {
    if (!session.id || isStreaming) return;
    setIsStreaming(true);
    setStreamingContent("");
    setReactions([]);
    setShowNominate(false);
    setShowFullMessage(false);

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
              const refetchResult = await refetchSession();
              const freshMessages = (refetchResult?.data as any)?.messages || [];
              const freshLastAiMsg = [...freshMessages].reverse().find((m: any) => m.role === "assistant");
              if (freshLastAiMsg) {
                loadReactionsForMessage(freshLastAiMsg.id);
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  }, [session.id, isStreaming, refetchSession, toast, loadReactionsForMessage]);

  const addComment = useMutation({
    mutationFn: async (data: { content: string; targetTwinrayId?: number | null }) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${session.id}/comment`, data);
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      setShowCommentInput(false);
      setCommentTarget(null);
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
  const displaySpeaker = speakingParticipant || lastSpeaker;
  const displayContent = streamingContent || lastMessage?.content || "";
  const isUserMessage = lastMessage?.role === "user" && !isStreaming && !currentSpeaker;

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">THEME</div>
            <div className="font-medium text-sm" data-testid="text-session-topic">{session.topic}</div>
          </div>
          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">{isActive ? "LIVE" : "DONE"}</Badge>
        </div>
        {totalLimit > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{totalUsed} / {totalLimit}</span>
            </div>
            <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </Card>

      {displaySpeaker && !isUserMessage && (
        <Card className="p-4" data-testid="assembly-stage">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="w-20 h-20 border-2 border-primary/30">
              {displaySpeaker.profilePhoto && <AvatarImage src={displaySpeaker.profilePhoto} />}
              <AvatarFallback className="text-2xl">{displaySpeaker.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <div className="font-bold text-sm flex items-center gap-1 justify-center">
                <Mic className="w-3.5 h-3.5 text-primary" />
                {displaySpeaker.name}
                {isStreaming && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
              </div>
              {session.turnCounts && (
                <div className="text-[10px] text-muted-foreground">
                  {session.turnCounts[displaySpeaker.id] || 0}/{session.maxTurnsPerParticipant || 3} 発言
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 bg-secondary/30 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto" data-testid="stage-content">
            {isStreaming ? streamingContent || "..." : (
              showFullMessage ? displayContent : displayContent.substring(0, 200)
            )}
            {!isStreaming && displayContent.length > 200 && (
              <button className="text-primary text-xs mt-1 block" onClick={() => setShowFullMessage(!showFullMessage)}>
                {showFullMessage ? "折りたたむ" : "...もっと見る"}
              </button>
            )}
          </div>
        </Card>
      )}

      {isUserMessage && lastMessage && (
        <Card className="p-4 border-primary/30" data-testid="user-message-stage">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">議長</span>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-sm whitespace-pre-wrap">{lastMessage.content}</div>
        </Card>
      )}

      {!isStreaming && messages.length === 0 && isActive && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm mb-3">会議を始めましょう</p>
          <Button onClick={() => triggerNext()} data-testid="button-first-speaker">
            <Mic className="w-4 h-4 mr-2" /> 最初の発言者を呼ぶ
          </Button>
        </div>
      )}

      {(reactions.length > 0 || isLoadingReactions) && (
        <Card className="p-3" data-testid="reactions-panel">
          <div className="text-xs font-medium text-muted-foreground mb-2">RESONANCE</div>
          {isLoadingReactions ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /><span className="text-xs">共鳴判定中...</span></div>
          ) : (
            <div className="space-y-1.5">
              {reactions.map(r => (
                <div key={r.twinrayId} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded p-1.5 transition-colors" onClick={() => setExpandedReaction(expandedReaction === r.twinrayId ? null : r.twinrayId)} data-testid={`reaction-${r.twinrayId}`}>
                  <Avatar className="w-7 h-7 shrink-0">
                    {r.profilePhoto && <AvatarImage src={r.profilePhoto} />}
                    <AvatarFallback className="text-[10px]">{r.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{r.name}</span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[60px]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${r.resonance * 100}%`, backgroundColor: r.resonance > 0.7 ? 'hsl(var(--primary))' : r.resonance > 0.4 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted))' }} />
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">「{r.reaction}」</div>
                  </div>
                  {isActive && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] shrink-0" onClick={(e) => { e.stopPropagation(); setShowNominate(false); triggerNext(r.twinrayId); }} data-testid={`nominate-${r.twinrayId}`}>
                      登壇
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {isActive && !isStreaming && messages.length > 0 && (
        <Card className="p-3 space-y-2" data-testid="chairman-controls">
          <div className="text-xs font-medium text-muted-foreground">CHAIRMAN</div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => triggerNext()} disabled={isStreaming || limitReached} data-testid="button-auto-next">
              <Mic className="w-3.5 h-3.5 mr-1.5" /> 次の発言者
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCommentInput(!showCommentInput)} data-testid="button-chairman-speak">
              <User className="w-3.5 h-3.5 mr-1.5" /> 議長発言
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowNominate(!showNominate)} data-testid="button-nominate">
              指名して登壇
            </Button>
          </div>

          {showNominate && (
            <div className="space-y-2 border rounded-md p-2">
              <div className="text-xs text-muted-foreground">誰を指名しますか？</div>
              <div className="flex flex-wrap gap-1.5">
                {participants.map(p => (
                  <Button key={p.id} variant="outline" size="sm" className="h-7 text-xs" onClick={() => { triggerNext(p.id, nominatePrompt || undefined); setNominatePrompt(""); }} data-testid={`nominate-btn-${p.id}`}>
                    <Avatar className="w-4 h-4 mr-1">
                      {p.profilePhoto && <AvatarImage src={p.profilePhoto} />}
                      <AvatarFallback className="text-[8px]">{p.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {p.name}
                  </Button>
                ))}
              </div>
              <Textarea placeholder="（任意）お題を添える..." value={nominatePrompt} onChange={(e) => setNominatePrompt(e.target.value)} className="resize-none text-xs" rows={2} data-testid="input-nominate-prompt" />
            </div>
          )}

          {showCommentInput && (
            <div className="space-y-2 border rounded-md p-2">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground">宛先:</span>
                <Button variant={commentTarget === null ? "default" : "outline"} size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setCommentTarget(null)}>全体</Button>
                {participants.map(p => (
                  <Button key={p.id} variant={commentTarget === p.id ? "default" : "outline"} size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setCommentTarget(p.id)}>
                    {p.name}
                  </Button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <Textarea placeholder="議長として発言..." value={comment} onChange={(e) => setComment(e.target.value)} className="resize-none flex-1 text-sm" rows={2} data-testid="input-chairman-comment"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && comment.trim()) { e.preventDefault(); addComment.mutate({ content: comment, targetTwinrayId: commentTarget }); } }} />
                <Button size="icon" className="shrink-0 h-10 w-10" onClick={() => addComment.mutate({ content: comment, targetTwinrayId: commentTarget })} disabled={!comment.trim() || addComment.isPending} data-testid="button-send-comment">
                  {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {limitReached && isActive && (
        <Card className="p-3 border-yellow-500/30 space-y-2" data-testid="limit-reached">
          <p className="text-sm">リミットに到達しました。</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => extendSession.mutate(3)} disabled={extendSession.isPending} data-testid="button-extend">
              {extendSession.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />} もうちょい続ける (+3回)
            </Button>
            <Button variant="outline" size="sm" onClick={() => summarize.mutate(false)} disabled={summarize.isPending} data-testid="button-summarize">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> まとめる
            </Button>
            <Button variant="outline" size="sm" onClick={() => summarize.mutate(true)} disabled={summarize.isPending} data-testid="button-summarize-meidia">
              まとめてMEiDIA化
            </Button>
            <Button variant="outline" size="sm" onClick={() => completeSession.mutate()} data-testid="button-complete">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> 完了
            </Button>
          </div>
        </Card>
      )}

      {!limitReached && isActive && !isStreaming && messages.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => summarize.mutate(false)} disabled={summarize.isPending}>
            {summarize.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />} まとめる
          </Button>
          <Button variant="outline" size="sm" onClick={() => completeSession.mutate()}>
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> 完了
          </Button>
        </div>
      )}

      {messages.length > 1 && (
        <MessageLog messages={messages} participants={participants} />
      )}

      {session.summary && (
        <Card className="p-4 space-y-2">
          <div className="text-sm font-medium flex items-center gap-1"><FileText className="w-4 h-4" /> SUMMARY</div>
          <div className="text-sm whitespace-pre-wrap" data-testid="text-summary">{session.summary}</div>
        </Card>
      )}

      <div ref={scrollRef} />
    </div>
  );
}

function MessageLog({ messages, participants }: { messages: MeetingMessage[]; participants: TwinrayParticipant[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayMessages = expanded ? messages : messages.slice(-5);

  return (
    <Card className="p-3">
      <button className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground mb-2" onClick={() => setExpanded(!expanded)}>
        <span>LOG（{messages.length}件）</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {!expanded && messages.length > 5 && (
          <div className="text-[10px] text-muted-foreground text-center py-1">...{messages.length - 5}件省略</div>
        )}
        {displayMessages.map(msg => {
          const isUser = msg.role === "user";
          const speaker = isUser ? null : participants.find(p => p.id === msg.twinrayId);
          return (
            <div key={msg.id} className={`flex items-start gap-1.5 text-xs ${isUser ? "pl-4" : ""}`} data-testid={`log-message-${msg.id}`}>
              {!isUser && (
                <Avatar className="w-5 h-5 shrink-0 mt-0.5">
                  {speaker?.profilePhoto && <AvatarImage src={speaker.profilePhoto} />}
                  <AvatarFallback className="text-[8px]">{speaker?.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
              )}
              {isUser && <User className="w-4 h-4 shrink-0 mt-0.5 text-primary" />}
              <div className="flex-1 min-w-0">
                <span className="font-medium">{isUser ? "議長" : speaker?.name || "?"}: </span>
                <span className="text-muted-foreground">{msg.content.substring(0, 80)}{msg.content.length > 80 ? "..." : ""}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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
