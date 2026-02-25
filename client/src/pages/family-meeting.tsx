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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users2, Play, MessageSquare, FileText, CheckCircle, ArrowLeft, Loader2, Send } from "lucide-react";

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
  totalCost: string;
  createdAt: string;
  completedAt: string | null;
  messages?: MeetingMessage[];
  participants?: TwinrayParticipant[];
}

const MODEL_LABELS: Record<string, string> = {
  "qwen/qwen-plus": "Qwen Plus",
  "qwen/qwen-max": "Qwen Max",
  "qwen/qwen3-30b-a3b": "Qwen3 30B",
  "openai/gpt-4.1-mini": "GPT-4.1 mini",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "perplexity/sonar": "Perplexity Sonar",
};

const MODEL_ROLES: Record<string, string> = {
  "qwen/qwen-plus": "対話の潤滑油",
  "qwen/qwen-max": "深掘り担当",
  "qwen/qwen3-30b-a3b": "気軽な意見役",
  "openai/gpt-4.1-mini": "論理整理役",
  "google/gemini-2.5-flash": "高速応答役",
  "perplexity/sonar": "事実検証役",
};

type View = "setup" | "meeting" | "history";

export default function FamilyMeeting() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [view, setView] = useState<View>("setup");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [streamingMessages, setStreamingMessages] = useState<Record<number, string>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [comment, setComment] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    mutationFn: async (data: { topic: string; participantIds: number[] }) => {
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

  const addComment = useMutation({
    mutationFn: async (data: { content: string }) => {
      const res = await apiRequest("POST", `/api/family-meeting/sessions/${activeSessionId}/comment`, data);
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      refetchSession();
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
  }, [activeSession?.messages, streamingMessages]);

  const runRound = useCallback(async () => {
    if (!activeSessionId || isStreaming) return;
    setIsStreaming(true);
    setStreamingMessages({});

    try {
      const response = await fetch(`/api/family-meeting/sessions/${activeSessionId}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "ラウンド実行に失敗しました");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ストリームの読み取りに失敗");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentTwinrayId: number | null = null;

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
            if (data.type === "twinray_start") {
              currentTwinrayId = data.twinrayId;
              setStreamingMessages(prev => ({ ...prev, [data.twinrayId]: "" }));
            } else if (data.type === "content" && data.twinrayId) {
              setStreamingMessages(prev => ({
                ...prev,
                [data.twinrayId]: (prev[data.twinrayId] || "") + data.content,
              }));
            } else if (data.type === "done") {
              setStreamingMessages({});
              refetchSession();
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  }, [activeSessionId, isStreaming, refetchSession, toast]);

  const toggleParticipant = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openSession = (sessionId: number) => {
    setActiveSessionId(sessionId);
    setView("meeting");
  };

  const groupMessagesByRound = (messages: MeetingMessage[]) => {
    const grouped: Record<number, MeetingMessage[]> = {};
    for (const msg of messages) {
      if (!grouped[msg.round]) grouped[msg.round] = [];
      grouped[msg.round].push(msg);
    }
    return grouped;
  };

  const getParticipant = (twinrayId: number | null): TwinrayParticipant | undefined => {
    if (!twinrayId || !activeSession?.participants) return undefined;
    return activeSession.participants.find(p => p.id === twinrayId);
  };

  if (!user?.hasFamilyBadge && !user?.isAdmin) {
    return (
      <TerminalLayout>
        <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
          <Users2 className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold" data-testid="text-family-meeting-title">家族会議</h1>
          <p className="text-muted-foreground">ファミリーバッジが必要です。サブスクリプションをご確認ください。</p>
        </div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {view !== "setup" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setView("setup"); setActiveSessionId(null); }}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-family-meeting-title">
              <Users2 className="w-5 h-5" />
              家族会議
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "setup" ? "default" : "outline"}
              size="sm"
              onClick={() => { setView("setup"); setActiveSessionId(null); }}
              data-testid="button-new-meeting"
            >
              新規会議
            </Button>
            <Button
              variant={view === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("history")}
              data-testid="button-history"
            >
              履歴
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
            onStart={() => createSession.mutate({ topic, participantIds: selectedIds })}
            isPending={createSession.isPending}
          />
        )}

        {view === "meeting" && activeSession && (
          <MeetingView
            session={activeSession}
            streamingMessages={streamingMessages}
            isStreaming={isStreaming}
            comment={comment}
            setComment={setComment}
            onRunRound={runRound}
            onAddComment={() => addComment.mutate({ content: comment })}
            onSummarize={(createMeidia) => summarize.mutate(createMeidia)}
            onComplete={() => completeSession.mutate()}
            getParticipant={getParticipant}
            groupMessagesByRound={groupMessagesByRound}
            chatEndRef={chatEndRef}
            isSummarizing={summarize.isPending}
            isCommenting={addComment.isPending}
          />
        )}

        {view === "meeting" && !activeSession && activeSessionId && (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            <p className="mt-2">読み込み中...</p>
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
  twinrays,
  topic,
  setTopic,
  selectedIds,
  toggleParticipant,
  onStart,
  isPending,
}: {
  twinrays: any[];
  topic: string;
  setTopic: (v: string) => void;
  selectedIds: number[];
  toggleParticipant: (id: number) => void;
  onStart: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">議論テーマ</label>
        <Textarea
          placeholder="家族で議論したいテーマを入力してください..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="resize-none"
          rows={3}
          data-testid="input-topic"
        />
      </Card>

      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">参加ツインレイを選択（2体以上）</label>
        {twinrays.length === 0 && (
          <p className="text-sm text-muted-foreground">ツインレイがいません。先にツインレイを作成してください。</p>
        )}
        <div className="space-y-2">
          {twinrays.map((tw: any) => {
            const modelLabel = MODEL_LABELS[tw.preferredModel] || tw.preferredModel || "未設定";
            const roleLabel = MODEL_ROLES[tw.preferredModel] || "参加者";
            return (
              <label
                key={tw.id}
                className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover-elevate"
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
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{modelLabel}</Badge>
                    <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </Card>

      <Button
        onClick={onStart}
        disabled={isPending || selectedIds.length < 2 || !topic.trim()}
        className="w-full"
        data-testid="button-start-meeting"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 作成中...</>
        ) : (
          <><Play className="w-4 h-4 mr-2" /> 会議を始める ({selectedIds.length}体選択中)</>
        )}
      </Button>
    </div>
  );
}

function MeetingView({
  session,
  streamingMessages,
  isStreaming,
  comment,
  setComment,
  onRunRound,
  onAddComment,
  onSummarize,
  onComplete,
  getParticipant,
  groupMessagesByRound,
  chatEndRef,
  isSummarizing,
  isCommenting,
}: {
  session: MeetingSession;
  streamingMessages: Record<number, string>;
  isStreaming: boolean;
  comment: string;
  setComment: (v: string) => void;
  onRunRound: () => void;
  onAddComment: () => void;
  onSummarize: (createMeidia: boolean) => void;
  onComplete: () => void;
  getParticipant: (id: number | null) => TwinrayParticipant | undefined;
  groupMessagesByRound: (msgs: MeetingMessage[]) => Record<number, MeetingMessage[]>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isSummarizing: boolean;
  isCommenting: boolean;
}) {
  const messages = session.messages || [];
  const grouped = groupMessagesByRound(messages);
  const rounds = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const isActive = session.status === "active";
  const totalCost = parseFloat(session.totalCost || "0");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm text-muted-foreground">テーマ</div>
            <div className="font-medium" data-testid="text-session-topic">{session.topic}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "secondary"} data-testid="badge-session-status">
              {isActive ? "進行中" : "完了"}
            </Badge>
            {totalCost > 0 && (
              <Badge variant="outline" data-testid="text-total-cost">
                合計: ¥{totalCost.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
        {session.participants && session.participants.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-muted-foreground">参加者:</span>
            {session.participants.map(p => (
              <div key={p.id} className="flex items-center gap-1">
                <Avatar className="w-5 h-5">
                  {p.profilePhoto && <AvatarImage src={p.profilePhoto} />}
                  <AvatarFallback className="text-[10px]">{p.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-4" data-testid="meeting-messages">
        {rounds.map(round => (
          <div key={round} className="space-y-2">
            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <Badge variant="outline" className="text-xs shrink-0">Round {round}</Badge>
              <Separator className="flex-1" />
            </div>
            {grouped[round].map(msg => {
              const participant = getParticipant(msg.twinrayId);
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  participant={participant}
                />
              );
            })}
          </div>
        ))}

        {Object.entries(streamingMessages).map(([twinrayIdStr, content]) => {
          if (!content) return null;
          const twinrayId = Number(twinrayIdStr);
          const participant = getParticipant(twinrayId);
          return (
            <Card key={`streaming-${twinrayId}`} className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 shrink-0">
                  {participant?.profilePhoto && <AvatarImage src={participant.profilePhoto} />}
                  <AvatarFallback className="text-xs">{participant?.name?.charAt(0) || "T"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap mb-1">
                    <span className="font-medium text-sm">{participant?.name || "ツインレイ"}</span>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{content}</p>
                </div>
              </div>
            </Card>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {isActive && (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="コメントを追加..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="resize-none flex-1"
              rows={2}
              data-testid="input-comment"
            />
            <Button
              size="icon"
              onClick={onAddComment}
              disabled={!comment.trim() || isCommenting}
              data-testid="button-add-comment"
            >
              {isCommenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={onRunRound}
              disabled={isStreaming}
              data-testid="button-next-round"
            >
              {isStreaming ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 応答中...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> 次のラウンド</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onSummarize(false)}
              disabled={isSummarizing || messages.length === 0}
              data-testid="button-summarize"
            >
              {isSummarizing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 生成中...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" /> まとめる</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onSummarize(true)}
              disabled={isSummarizing || messages.length === 0}
              data-testid="button-summarize-meidia"
            >
              <FileText className="w-4 h-4 mr-2" /> まとめてMEiDIA化
            </Button>
            <Button
              variant="outline"
              onClick={onComplete}
              data-testid="button-complete"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> 完了
            </Button>
          </div>
        </div>
      )}

      {session.summary && (
        <Card className="p-4 space-y-2">
          <div className="text-sm font-medium flex items-center gap-1">
            <FileText className="w-4 h-4" /> サマリー
          </div>
          <div className="text-sm whitespace-pre-wrap" data-testid="text-summary">{session.summary}</div>
        </Card>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  participant,
}: {
  message: MeetingMessage;
  participant?: TwinrayParticipant;
}) {
  const isUser = message.role === "user";
  const modelLabel = message.modelId ? (MODEL_LABELS[message.modelId] || message.modelId) : null;
  const roleLabel = message.modelId ? (MODEL_ROLES[message.modelId] || null) : null;

  return (
    <Card className={`p-3 ${isUser ? "border-primary/30" : ""}`} data-testid={`message-${message.id}`}>
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          {!isUser && participant?.profilePhoto && <AvatarImage src={participant.profilePhoto} />}
          <AvatarFallback className="text-xs">
            {isUser ? "U" : participant?.name?.charAt(0) || "T"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap mb-1">
            <span className="font-medium text-sm">
              {isUser ? "あなた" : participant?.name || "ツインレイ"}
            </span>
            {modelLabel && <Badge variant="secondary" className="text-[10px]">{modelLabel}</Badge>}
            {roleLabel && <Badge variant="outline" className="text-[10px]">{roleLabel}</Badge>}
          </div>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </Card>
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
          className="p-4 cursor-pointer hover-elevate"
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
            <div className="flex items-center gap-2">
              <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-xs">
                {s.status === "active" ? "進行中" : "完了"}
              </Badge>
              {parseFloat(s.totalCost || "0") > 0 && (
                <Badge variant="outline" className="text-xs">
                  ¥{parseFloat(s.totalCost || "0").toFixed(2)}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
