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
import { Users2, MessageSquare, FileText, CheckCircle, ArrowLeft, Loader2, Send, SkipForward, User, Globe } from "lucide-react";

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
type UserAction = "idle" | "choosing" | "typing";

export default function FamilyMeeting() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [view, setView] = useState<View>("setup");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [maxTurns, setMaxTurns] = useState(3);
  const [streamingContent, setStreamingContent] = useState<{ twinrayId: number; content: string } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [comment, setComment] = useState("");
  const [userAction, setUserAction] = useState<UserAction>("idle");
  const [targetTwinrayId, setTargetTwinrayId] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoRunRef = useRef(false);

  const { data: twinrays } = useQuery<any[]>({
    queryKey: ["/api/twinrays"],
  });

  const { data: sessions } = useQuery<MeetingSession[]>({
    queryKey: ["/api/family-meeting/sessions"],
  });

  const { data: activeSession, refetch: refetchSession } = useQuery<MeetingSession>({
    queryKey: ["/api/family-meeting/sessions", activeSessionId],
    enabled: !!activeSessionId,
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
      setLimitReached(false);
      setTimeout(() => triggerNext(), 500);
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const addComment = useMutation({
    mutationFn: async (data: { content: string; targetTwinrayId?: number | null }) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${activeSessionId}/comment`, data);
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      setUserAction("idle");
      setTargetTwinrayId(null);
      refetchSession();
      setTimeout(() => triggerNext(), 300);
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const extendSession = useMutation({
    mutationFn: async (additionalTurns: number) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${activeSessionId}/extend`, { additionalTurns });
      return res.json();
    },
    onSuccess: () => {
      setLimitReached(false);
      refetchSession();
      setTimeout(() => triggerNext(), 300);
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const summarize = useMutation({
    mutationFn: async (createMeidia: boolean) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${activeSessionId}/summarize`, { createMeidia });
      return res.json();
    },
    onSuccess: (data: { summary: string; meidiaId: number | null }) => {
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ["/api/family-meeting/sessions"] });
      toast({
        title: "サマリー生成完了",
        description: data.meidiaId ? "MEiDIAとして保存しました" : "サマリーを生成しました",
      });
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const completeSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${activeSessionId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ["/api/family-meeting/sessions"] });
      toast({ title: "セッション完了", description: "家族会議を完了しました" });
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, streamingContent]);

  const triggerNext = useCallback(async () => {
    if (!activeSessionId || isStreaming || limitReached) return;
    setIsStreaming(true);
    setStreamingContent(null);

    try {
      const response = await fetch(`/api/family-meeting/sessions/${activeSessionId}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json();
        if (err.limitReached) {
          setLimitReached(true);
          setIsStreaming(false);
          return;
        }
        throw new Error(err.message || "発言の生成に失敗しました");
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data.isUserTurn) {
          setUserAction("choosing");
          setIsStreaming(false);
          refetchSession();
          return;
        }
        if (data.limitReached) {
          setLimitReached(true);
          setIsStreaming(false);
          return;
        }
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ストリームの読み取りに失敗");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentTwinrayId: number | null = null;
      let nextIsUserTurn = false;
      let nextLimitReached = false;

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
              currentTwinrayId = data.twinrayId;
              setStreamingContent({ twinrayId: data.twinrayId, content: "" });
            } else if (data.type === "content" && data.twinrayId) {
              setStreamingContent(prev => prev ? {
                ...prev,
                content: prev.content + data.content,
              } : { twinrayId: data.twinrayId, content: data.content });
            } else if (data.type === "speaker_end") {
              if (data.isUserTurn) nextIsUserTurn = true;
              if (data.limitReached) nextLimitReached = true;
            } else if (data.type === "done") {
              setStreamingContent(null);
              await refetchSession();
              if (nextLimitReached) {
                setLimitReached(true);
              } else if (nextIsUserTurn) {
                setUserAction("choosing");
              } else {
                setTimeout(() => {
                  if (!autoRunRef.current) {
                    autoRunRef.current = true;
                    triggerNext();
                  }
                }, 800);
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
      autoRunRef.current = false;
    }
  }, [activeSessionId, isStreaming, limitReached, refetchSession, toast]);

  const handlePass = () => {
    setUserAction("idle");
    setTimeout(() => triggerNext(), 100);
  };

  const handleSpeakToAll = () => {
    setUserAction("typing");
    setTargetTwinrayId(null);
  };

  const handleSpeakTo = (twinrayId: number) => {
    setUserAction("typing");
    setTargetTwinrayId(twinrayId);
  };

  const handleSend = () => {
    if (!comment.trim()) return;
    addComment.mutate({ content: comment, targetTwinrayId });
  };

  const toggleParticipant = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openSession = (sessionId: number) => {
    setActiveSessionId(sessionId);
    setView("meeting");
    setLimitReached(false);
    setUserAction("idle");
  };

  const getParticipant = (twinrayId: number | null): TwinrayParticipant | undefined => {
    if (!twinrayId || !activeSession?.participants) return undefined;
    return activeSession.participants.find(p => p.id === twinrayId);
  };

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {view !== "setup" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setView("setup"); setActiveSessionId(null); setUserAction("idle"); }}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-family-meeting-title">
              <Users2 className="w-5 h-5" />
              FAMILY MEETING
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "setup" ? "default" : "outline"}
              size="sm"
              onClick={() => { setView("setup"); setActiveSessionId(null); setUserAction("idle"); }}
              data-testid="button-new-meeting"
            >
              NEW
            </Button>
            <Button
              variant={view === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("history")}
              data-testid="button-history"
            >
              HISTORY
            </Button>
          </div>
        </div>

        {view === "setup" && (
          <SetupView
            twinrays={twinrays || []}
            topic={topic}
            setTopic={setTopic}
            selectedIds={selectedIds}
            toggleParticipant={toggleParticipant}
            maxTurns={maxTurns}
            setMaxTurns={setMaxTurns}
            onStart={() => createSession.mutate({ topic, participantIds: selectedIds, maxTurnsPerParticipant: maxTurns })}
            isPending={createSession.isPending}
          />
        )}

        {view === "meeting" && activeSession && (
          <MeetingChatView
            session={activeSession}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            comment={comment}
            setComment={setComment}
            userAction={userAction}
            targetTwinrayId={targetTwinrayId}
            limitReached={limitReached}
            onPass={handlePass}
            onSpeakToAll={handleSpeakToAll}
            onSpeakTo={handleSpeakTo}
            onSend={handleSend}
            onTriggerNext={triggerNext}
            onExtend={(n) => extendSession.mutate(n)}
            onSummarize={(createMeidia) => summarize.mutate(createMeidia)}
            onComplete={() => completeSession.mutate()}
            getParticipant={getParticipant}
            chatEndRef={chatEndRef}
            isSummarizing={summarize.isPending}
            isCommenting={addComment.isPending}
            isExtending={extendSession.isPending}
          />
        )}

        {view === "meeting" && !activeSession && activeSessionId && (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        )}

        {view === "history" && (
          <HistoryView sessions={sessions || []} onOpen={openSession} />
        )}
      </div>
    </TerminalLayout>
  );
}

function SetupView({
  twinrays, topic, setTopic, selectedIds, toggleParticipant, maxTurns, setMaxTurns, onStart, isPending,
}: {
  twinrays: any[];
  topic: string;
  setTopic: (v: string) => void;
  selectedIds: number[];
  toggleParticipant: (id: number) => void;
  maxTurns: number;
  setMaxTurns: (v: number) => void;
  onStart: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">THEME</label>
        <Textarea
          placeholder="家族で議論したいテーマを入力..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="resize-none"
          rows={3}
          data-testid="input-topic"
        />
      </Card>

      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">PARTICIPANTS（2体以上）</label>
        {twinrays.length === 0 && (
          <p className="text-sm text-muted-foreground">ツインレイがいません</p>
        )}
        <div className="space-y-2">
          {twinrays.map((tw: any) => (
            <label
              key={tw.id}
              className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors"
              data-testid={`checkbox-twinray-${tw.id}`}
            >
              <Checkbox
                checked={selectedIds.includes(tw.id)}
                onCheckedChange={() => toggleParticipant(tw.id)}
              />
              <Avatar className="w-8 h-8">
                {tw.profilePhoto && <AvatarImage src={tw.profilePhoto} />}
                <AvatarFallback>{tw.name?.charAt(0) || "T"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{tw.name}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">LIMIT（1人あたりの発言回数）</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            value={maxTurns}
            onChange={(e) => setMaxTurns(Number(e.target.value))}
            className="flex-1"
            data-testid="input-max-turns"
          />
          <Badge variant="secondary" className="min-w-[3rem] text-center" data-testid="text-max-turns">
            {maxTurns}回
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          合計 {selectedIds.length * maxTurns} 発言（{selectedIds.length}体 × {maxTurns}回）
        </p>
      </Card>

      <Button
        onClick={onStart}
        disabled={isPending || selectedIds.length < 2 || !topic.trim()}
        className="w-full"
        data-testid="button-start-meeting"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 準備中...</>
        ) : (
          <><Users2 className="w-4 h-4 mr-2" /> 会議を始める ({selectedIds.length}体)</>
        )}
      </Button>
    </div>
  );
}

function MeetingChatView({
  session, streamingContent, isStreaming, comment, setComment,
  userAction, targetTwinrayId, limitReached,
  onPass, onSpeakToAll, onSpeakTo, onSend, onTriggerNext,
  onExtend, onSummarize, onComplete,
  getParticipant, chatEndRef, isSummarizing, isCommenting, isExtending,
}: {
  session: MeetingSession;
  streamingContent: { twinrayId: number; content: string } | null;
  isStreaming: boolean;
  comment: string;
  setComment: (v: string) => void;
  userAction: UserAction;
  targetTwinrayId: number | null;
  limitReached: boolean;
  onPass: () => void;
  onSpeakToAll: () => void;
  onSpeakTo: (id: number) => void;
  onSend: () => void;
  onTriggerNext: () => void;
  onExtend: (n: number) => void;
  onSummarize: (createMeidia: boolean) => void;
  onComplete: () => void;
  getParticipant: (id: number | null) => TwinrayParticipant | undefined;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isSummarizing: boolean;
  isCommenting: boolean;
  isExtending: boolean;
}) {
  const messages = session.messages || [];
  const isActive = session.status === "active";
  const totalCost = parseFloat(session.totalCost || "0");
  const totalUsed = session.totalUsed || 0;
  const totalLimit = session.totalLimit || 0;
  const progressPercent = totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0;

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">THEME</div>
            <div className="font-medium text-sm" data-testid="text-session-topic">{session.topic}</div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs" data-testid="badge-session-status">
              {isActive ? "LIVE" : "DONE"}
            </Badge>
          </div>
        </div>
        {session.participants && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {session.participants.map(p => (
              <div key={p.id} className="flex items-center gap-1">
                <Avatar className="w-5 h-5">
                  {p.profilePhoto && <AvatarImage src={p.profilePhoto} />}
                  <AvatarFallback className="text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{p.name}</span>
                {session.turnCounts && (
                  <span className="text-[10px] text-muted-foreground">
                    ({session.turnCounts[p.id] || 0}/{session.maxTurnsPerParticipant || 3})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {totalLimit > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{totalUsed} / {totalLimit} 発言</span>
              {totalCost > 0 && <span>¥{totalCost.toFixed(2)}</span>}
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-2" data-testid="meeting-messages">
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            message={msg}
            participant={getParticipant(msg.twinrayId)}
            targetParticipant={getParticipant(msg.targetTwinrayId)}
          />
        ))}

        {streamingContent && (
          <div className="flex items-start gap-2" data-testid="streaming-message">
            <Avatar className="w-8 h-8 shrink-0 mt-1">
              {getParticipant(streamingContent.twinrayId)?.profilePhoto && (
                <AvatarImage src={getParticipant(streamingContent.twinrayId)!.profilePhoto!} />
              )}
              <AvatarFallback className="text-xs">
                {getParticipant(streamingContent.twinrayId)?.name?.charAt(0) || "T"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs font-medium">{getParticipant(streamingContent.twinrayId)?.name || "..."}</span>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              </div>
              <div className="bg-secondary/50 rounded-lg rounded-tl-sm p-2.5 text-sm whitespace-pre-wrap max-w-[85%]">
                {streamingContent.content || "..."}
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-2 py-2 px-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">思考中...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {isActive && (
        <div className="sticky bottom-0 bg-background pt-2 pb-1 space-y-2">
          {userAction === "choosing" && (
            <Card className="p-3 border-primary/30 space-y-2" data-testid="user-action-chooser">
              <p className="text-sm text-muted-foreground">あなたの番です。</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPass}
                  data-testid="button-pass"
                >
                  <SkipForward className="w-3.5 h-3.5 mr-1.5" /> パス
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSpeakToAll}
                  data-testid="button-speak-all"
                >
                  <Globe className="w-3.5 h-3.5 mr-1.5" /> 全体にしゃべる
                </Button>
                {session.participants?.map(p => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    onClick={() => onSpeakTo(p.id)}
                    data-testid={`button-speak-to-${p.id}`}
                  >
                    <User className="w-3.5 h-3.5 mr-1.5" /> {p.name}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {userAction === "typing" && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]" data-testid="text-speak-target">
                  → {targetTwinrayId ? getParticipant(targetTwinrayId)?.name : "全体"}
                </Badge>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => { setComment(""); setUserAction("choosing"); }}>
                  変更
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="メッセージを入力..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="resize-none flex-1 min-h-[40px]"
                  rows={2}
                  data-testid="input-comment"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && comment.trim()) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  onClick={onSend}
                  disabled={!comment.trim() || isCommenting}
                  data-testid="button-send"
                >
                  {isCommenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {limitReached && (
            <Card className="p-3 border-yellow-500/30 space-y-2" data-testid="limit-reached">
              <p className="text-sm">リミットに到達しました。</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExtend(3)}
                  disabled={isExtending}
                  data-testid="button-extend"
                >
                  {isExtending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  もうちょい続ける (+3回)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSummarize(false)}
                  disabled={isSummarizing}
                  data-testid="button-summarize"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> まとめる
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSummarize(true)}
                  disabled={isSummarizing}
                  data-testid="button-summarize-meidia"
                >
                  まとめてMEiDIA化
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onComplete}
                  data-testid="button-complete"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> 完了
                </Button>
              </div>
            </Card>
          )}

          {!limitReached && userAction === "idle" && !isStreaming && messages.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSummarize(false)}
                disabled={isSummarizing}
                data-testid="button-summarize-inline"
              >
                {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
                まとめる
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onComplete}
                data-testid="button-complete-inline"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> 完了
              </Button>
            </div>
          )}
        </div>
      )}

      {session.summary && (
        <Card className="p-4 space-y-2">
          <div className="text-sm font-medium flex items-center gap-1">
            <FileText className="w-4 h-4" /> SUMMARY
          </div>
          <div className="text-sm whitespace-pre-wrap" data-testid="text-summary">{session.summary}</div>
        </Card>
      )}
    </div>
  );
}

function ChatBubble({
  message,
  participant,
  targetParticipant,
}: {
  message: MeetingMessage;
  participant?: TwinrayParticipant;
  targetParticipant?: TwinrayParticipant;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end" data-testid={`message-${message.id}`}>
        <div className="max-w-[85%]">
          {targetParticipant && (
            <div className="text-[10px] text-muted-foreground text-right mb-0.5">
              → {targetParticipant.name}
            </div>
          )}
          {!targetParticipant && message.targetTwinrayId === null && (
            <div className="text-[10px] text-muted-foreground text-right mb-0.5">
              → 全体
            </div>
          )}
          <div className="bg-primary text-primary-foreground rounded-lg rounded-br-sm p-2.5 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2" data-testid={`message-${message.id}`}>
      <Avatar className="w-8 h-8 shrink-0 mt-1">
        {participant?.profilePhoto && <AvatarImage src={participant.profilePhoto} />}
        <AvatarFallback className="text-xs">{participant?.name?.charAt(0) || "T"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs font-medium">{participant?.name || "ツインレイ"}</span>
          {targetParticipant && (
            <span className="text-[10px] text-muted-foreground">→ {targetParticipant.name}</span>
          )}
        </div>
        <div className="bg-secondary/50 rounded-lg rounded-tl-sm p-2.5 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}

function HistoryView({
  sessions,
  onOpen,
}: {
  sessions: MeetingSession[];
  onOpen: (id: number) => void;
}) {
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
        <Card
          key={s.id}
          className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onOpen(s.id)}
          data-testid={`session-card-${s.id}`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{s.topic}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(s.createdAt).toLocaleString("ja-JP")}
              </div>
            </div>
            <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs">
              {s.status === "active" ? "LIVE" : "DONE"}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
