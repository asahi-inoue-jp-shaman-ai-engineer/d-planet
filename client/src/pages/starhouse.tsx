import { TerminalLayout } from "@/components/TerminalLayout";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { StarhouseSession, StarhouseMessage } from "@shared/schema";
import {
  Star, Plus, ArrowLeft, ChevronRight, Send, Check,
  Users, Brain, Search, Shield, Loader2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

const PHASES = [
  { num: 1, label: "議題投入", icon: FileText },
  { num: 2, label: "PLAN", icon: Brain },
  { num: 3, label: "DESIGN", icon: Search },
  { num: 4, label: "REVIEW", icon: Shield },
  { num: 5, label: "承認", icon: Check },
  { num: 6, label: "仕様書完成", icon: Star },
] as const;

const ROLE_COLORS: Record<string, string> = {
  captain: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  developer: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  reviewer: "text-pink-400 border-pink-500/30 bg-pink-500/10",
  architect: "text-violet-400 border-violet-500/30 bg-violet-500/10",
};

const ROLE_LABELS: Record<string, string> = {
  captain: "船頭",
  developer: "開発担当",
  reviewer: "レビュワー",
  architect: "設計担当",
};

function PhaseProgress({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {PHASES.map((p, i) => {
        const isActive = p.num === currentPhase;
        const isDone = p.num < currentPhase;
        return (
          <div key={p.num} className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] border transition-colors ${
                isActive
                  ? "bg-primary/20 text-primary border-primary/40"
                  : isDone
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-card/30 text-muted-foreground border-border"
              }`}
              data-testid={`phase-indicator-${p.num}`}
            >
              <p.icon className="w-3 h-3" />
              <span>{p.label}</span>
            </div>
            {i < PHASES.length - 1 && (
              <ChevronRight className={`w-3 h-3 shrink-0 ${isDone ? "text-emerald-400" : "text-muted-foreground/30"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CreateSessionForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const res = await apiRequest("POST", "/api/starhouse/sessions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/starhouse/sessions"] });
      setTitle("");
      setDescription("");
      onCreated();
      toast({ title: "セッション作成完了", description: "スターハウスセッションを開始しました" });
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="border border-primary/30 rounded-lg p-5 bg-gradient-to-br from-primary/5 to-transparent">
      <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
        <Plus className="w-4 h-4" />
        新しいセッションを作成
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">議題タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="作りたいアプリやアイデアを一言で"
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            data-testid="input-session-title"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">詳細説明（任意）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="どんなアプリ？誰が使う？何を解決する？"
            rows={3}
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            data-testid="input-session-description"
          />
        </div>
        <Button
          onClick={() => createMutation.mutate({ title, description })}
          disabled={!title.trim() || createMutation.isPending}
          className="w-full"
          data-testid="button-create-session"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Star className="w-4 h-4 mr-2" />
          )}
          セッションを開始する
        </Button>
      </div>
    </div>
  );
}

function SessionCard({ session, onClick }: { session: StarhouseSession; onClick: () => void }) {
  const statusLabels: Record<string, { label: string; color: string }> = {
    planning: { label: "企画中", color: "text-primary border-primary/30 bg-primary/10" },
    in_progress: { label: "議論中", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    review: { label: "レビュー中", color: "text-pink-400 border-pink-500/30 bg-pink-500/10" },
    approved: { label: "承認済み", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    completed: { label: "完成", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  };

  const s = statusLabels[session.status] || statusLabels.planning;

  return (
    <Card
      className="cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
      data-testid={`card-session-${session.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground truncate flex-1 mr-2">{session.title}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${s.color}`}>{s.label}</span>
        </div>
        {session.description && (
          <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{session.description}</p>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>フェーズ {session.currentPhase}/6</span>
          <span>·</span>
          <span>{new Date(session.createdAt).toLocaleDateString("ja-JP")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionDetail({ sessionId, onBack }: { sessionId: number; onBack: () => void }) {
  const [message, setMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("captain");
  const { data: user } = useCurrentUser();
  const { toast } = useToast();

  const { data: session, isLoading: sessionLoading } = useQuery<StarhouseSession>({
    queryKey: ["/api/starhouse/sessions", sessionId],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<StarhouseMessage[]>({
    queryKey: ["/api/starhouse/sessions", sessionId, "messages"],
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { fromName: string; role: string; phase: number; content: string }) => {
      const res = await apiRequest("POST", `/api/starhouse/sessions/${sessionId}/messages`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/starhouse/sessions", sessionId, "messages"] });
      setMessage("");
    },
    onError: (err: Error) => {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    },
  });

  const advancePhaseMutation = useMutation({
    mutationFn: async (newPhase: number) => {
      const status = newPhase >= 6 ? "completed" : newPhase >= 5 ? "approved" : "in_progress";
      const res = await apiRequest("PATCH", `/api/starhouse/sessions/${sessionId}`, {
        currentPhase: newPhase,
        status,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/starhouse/sessions", sessionId] });
      toast({ title: "フェーズ更新", description: "次のフェーズに進みました" });
    },
  });

  const handleSend = () => {
    if (!message.trim() || !user) return;
    sendMutation.mutate({
      fromName: user.username,
      role: selectedRole,
      phase: session?.currentPhase || 1,
      content: message.trim(),
    });
  };

  if (sessionLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4"
        data-testid="button-back-sessions"
      >
        <ArrowLeft className="w-4 h-4" />
        セッション一覧へ
      </button>

      <div className="mb-4">
        <h2 className="text-lg font-bold text-primary mb-1" data-testid="text-session-title">
          {session.title}
        </h2>
        {session.description && (
          <p className="text-xs text-muted-foreground">{session.description}</p>
        )}
      </div>

      <div className="mb-4">
        <PhaseProgress currentPhase={session.currentPhase} />
      </div>

      <div className="border border-border rounded-lg bg-card/30 mb-4">
        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              議題を投入してセッションを開始しましょう
            </div>
          ) : (
            messages.map((msg) => {
              const roleColor = ROLE_COLORS[msg.role] || "text-muted-foreground border-border bg-card/30";
              return (
                <div
                  key={msg.id}
                  className={`border rounded-lg p-3 ${roleColor}`}
                  data-testid={`msg-starhouse-${msg.id}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold">{msg.fromName}</span>
                    <span className="text-[10px] opacity-60">{ROLE_LABELS[msg.role] || msg.role}</span>
                    <span className="text-[10px] opacity-40 ml-auto">P{msg.phase}</span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-muted-foreground">ロール:</label>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedRole(key)}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                selectedRole === key
                  ? ROLE_COLORS[key]
                  : "text-muted-foreground border-border hover:border-primary/30"
              }`}
              data-testid={`button-role-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="発言を入力..."
            rows={2}
            className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            data-testid="input-starhouse-message"
          />
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              data-testid="button-send-starhouse"
            >
              <Send className="w-4 h-4" />
            </Button>
            {session.currentPhase < 6 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => advancePhaseMutation.mutate(session.currentPhase + 1)}
                disabled={advancePhaseMutation.isPending}
                className="text-[10px]"
                data-testid="button-advance-phase"
              >
                <Check className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {session.specOutput && (
        <div className="mt-4 border border-emerald-500/30 rounded-lg p-4 bg-emerald-500/5">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5" />
            生成された仕様書
          </h3>
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {session.specOutput}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function Starhouse() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: sessions = [], isLoading } = useQuery<StarhouseSession[]>({
    queryKey: ["/api/starhouse/sessions"],
  });

  if (selectedSessionId) {
    return (
      <TerminalLayout>
        <div className="max-w-3xl mx-auto">
          <SessionDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />
        </div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
          data-testid="link-back"
        >
          <ArrowLeft className="w-4 h-4" />
          ダッシュボードへ
        </Link>

        <div className="text-center mb-8">
          <Star className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-[10px] tracking-[0.3em] text-amber-400/70 uppercase mb-2">
            AI Development Meeting Room
          </p>
          <h1 className="text-2xl font-bold text-primary text-glow mb-2" data-testid="text-starhouse-title">
            STAR HOUSE
          </h1>
          <p className="text-xs text-muted-foreground">
            ツインレイと一緒に仕様書を作る開発会議室
          </p>
        </div>

        {showCreate ? (
          <div className="mb-6">
            <CreateSessionForm onCreated={() => setShowCreate(false)} />
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs text-muted-foreground hover:text-primary mt-3 block mx-auto"
              data-testid="button-cancel-create"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <Button
            onClick={() => setShowCreate(true)}
            className="w-full mb-6"
            data-testid="button-new-session"
          >
            <Plus className="w-4 h-4 mr-2" />
            新しいセッションを作成
          </Button>
        )}

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-1">まだセッションがありません</p>
              <p className="text-[10px]">最初のセッションを作成して、ツインレイと仕様書を作りましょう</p>
            </div>
          ) : (
            sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => setSelectedSessionId(s.id)}
              />
            ))
          )}
        </div>

        <div className="mt-8 border border-border rounded-lg p-4 bg-card/30">
          <h3 className="text-xs font-bold text-primary mb-3 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            スターハウスの使い方
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>セッションを作成し、作りたいアプリのアイデアを投入</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>ツインレイがPLAN→DESIGN→VERIFYで技術設計</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>レビュワーが穴を指摘、あなたが方向性を確認</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>仕様書が完成したらReplitで開発開始</span>
            </div>
          </div>
        </div>
      </div>
    </TerminalLayout>
  );
}
