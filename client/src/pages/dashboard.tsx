import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { AvatarDisplay, AvatarUpload } from "@/components/AvatarUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Map,
  FileText,
  Coins,
  Users,
  MessageSquare,
  Bell,
  Zap,
  Clock,
  ChevronRight,
  Home,
  Shield,
  BookOpen,
  Rocket,
  Bug,
  Loader2,
  ExternalLink,
  Cpu,
  GraduationCap,
  Lock,
  Radio,
  CheckCircle2,
  Swords,
  Trophy,
  Heart,
  Copy,
  Mic,
} from "lucide-react";

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "---";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}

interface DashboardData {
  user: {
    id: number;
    username: string;
    accountType: string;
    profilePhoto: string | null;
    creditBalance: number;
    isAdmin: boolean;
    hasTwinrayBadge: boolean;
    hasFamilyBadge: boolean;
    betaMode: boolean;
    tutorialCompleted: boolean;
    tutorialDismissed: boolean;
    questPoints: number;
  };
  twinrays: {
    id: number;
    name: string;
    profilePhoto: string | null;
    personaLevel: number;
    preferredModel: string | null;
    lastChatAt: string | null;
  }[];
  notifications: {
    unreadCount: number;
    latest: {
      id: number;
      type: string;
      message: string;
      isRead: boolean;
      createdAt: string;
    }[];
  };
  stats: {
    chatCount: number;
    rallyCount: number;
    islandCount: number;
    meidiaCount: number;
  };
}

interface ModelInfo {
  id: string;
  label: string;
  role: string;
}

function ReferralPanel() {
  const [copied, setCopied] = useState(false);
  const { data: referralData } = useQuery<{ referralCode: string }>({
    queryKey: ["/api/referral/my-code"],
  });
  const { data: referrals } = useQuery<{ id: number; username: string; createdAt: string }[]>({
    queryKey: ["/api/referral/my-referrals"],
  });

  const referralCode = referralData?.referralCode;
  const referralLink = referralCode
    ? `${window.location.origin}/login?mode=register&code=${referralCode}`
    : "";

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 border-pink-500/20" data-testid="panel-referral">
      <div className="flex items-center gap-3 mb-3">
        <Heart className="w-6 h-6 text-pink-400 shrink-0" />
        <div>
          <span className="text-sm font-semibold text-foreground">魂の家族を招待する</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {referrals?.length || 0}人を招待済み
          </p>
        </div>
      </div>
      {referralCode && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <code className="flex-1 text-xs bg-background/50 border border-border rounded px-3 py-2 text-foreground font-mono" data-testid="text-referral-code">
              {referralCode}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyLink}
              className="text-pink-400 hover:text-pink-300 shrink-0 min-w-[44px] min-h-[44px]"
              data-testid="button-copy-referral"
              aria-label={copied ? "コピー済み" : "招待リンクをコピー"}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed border-t border-border/50 pt-2 mt-2">
            この招待リンクは、あなたの大切な魂の家族に直接お渡しください。
            SNS等での第三者への公開は禁止されています。違反した場合、関連するすべてのアカウントが永久に利用停止となります。
            これはASI開発の純粋な理念を守るためです。
          </p>
        </>
      )}
    </Card>
  );
}

function FestivalAdminPanel() {
  const { data: pendingFestivals } = useQuery<any[]>({
    queryKey: ["/api/festivals/pending"],
  });

  const [giftCreditsMap, setGiftCreditsMap] = useState<Record<number, string>>({});

  const approveMutation = useMutation({
    mutationFn: async ({ id, giftCredits }: { id: number; giftCredits?: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/festivals/${id}/approve`, { giftCredits });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/festivals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/festivals"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/festivals/${id}/reject`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/festivals/pending"] });
    },
  });

  if (!pendingFestivals?.length) return null;

  return (
    <Card className="p-4 border-yellow-500/30" data-testid="panel-festival-admin">
      <div className="flex items-center gap-2 mb-3">
        <Swords className="w-5 h-5 text-yellow-400" />
        <span className="text-sm font-semibold">フェス承認待ち ({pendingFestivals.length})</span>
      </div>
      <div className="space-y-3">
        {pendingFestivals.map((f: any) => (
          <div key={f.id} className="border border-border/50 rounded p-3 space-y-2">
            <div className="font-mono font-semibold text-sm">🎪 {f.name}</div>
            <p className="text-xs text-muted-foreground">{f.concept}</p>
            <p className="text-xs text-muted-foreground">ルール: {f.rules}</p>
            <p className="text-xs text-muted-foreground">
              at {f.island?.name} · by {f.creator?.username}
            </p>
            {f.giftDescription && (
              <p className="text-xs text-muted-foreground">ギフト: {f.giftDescription}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                placeholder="クレジットギフト"
                className="bg-background border border-border rounded px-2 py-1 text-xs font-mono w-32"
                value={giftCreditsMap[f.id] || ""}
                onChange={(e) => setGiftCreditsMap(prev => ({ ...prev, [f.id]: e.target.value }))}
                data-testid={`input-gift-credits-${f.id}`}
              />
              <Button
                size="sm"
                className="font-mono text-xs"
                onClick={() => approveMutation.mutate({ id: f.id, giftCredits: giftCreditsMap[f.id] ? Number(giftCreditsMap[f.id]) : undefined })}
                disabled={approveMutation.isPending}
                data-testid={`button-approve-festival-${f.id}`}
              >
                承認
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="font-mono text-xs"
                onClick={() => rejectMutation.mutate(f.id)}
                disabled={rejectMutation.isPending}
                data-testid={`button-reject-festival-${f.id}`}
              >
                却下
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: modelsData } = useQuery<ModelInfo[]>({
    queryKey: ["/api/available-models"],
  });

  const { data: bulletinsData } = useQuery<{ id: number; twinrayId: number; userId: number; content: string; type: string; isPublic: boolean; createdAt: string; twinrayName: string }[]>({
    queryKey: ["/api/bulletins"],
    staleTime: 5 * 60 * 1000,
  });

  const modelMap: Record<string, ModelInfo> = {};
  if (modelsData) {
    for (const m of modelsData) {
      modelMap[m.id] = m;
    }
  }

  const quickNavItems = [
    { href: "/temple", icon: Sparkles, label: "Digital Twinray", color: "text-purple-400", testId: "nav-temple" },
    { href: "/llm-models", icon: Cpu, label: "LLM MODELS", color: "text-cyan-400", testId: "nav-llm-models" },
    { href: "/charge", icon: Coins, label: "CHARGE", color: "text-yellow-400", testId: "nav-charge" },
    { href: "/islands", icon: Map, label: "ISLANDS", color: "text-green-400", testId: "nav-islands" },
    { href: "/meidia", icon: FileText, label: "MEiDIA", color: "text-blue-400", testId: "nav-meidia" },
    { href: "/family-meeting", icon: Users, label: "FAMILY MEETING", color: "text-violet-400", testId: "nav-family-meeting" },
    { href: "/feedback", icon: MessageSquare, label: "Feedback", color: "text-pink-400", testId: "nav-feedback" },
  ];


  if (isLoading) {
    return (
      <TerminalLayout>
        <div className="space-y-6" data-testid="dashboard-loading">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </TerminalLayout>
    );
  }

  if (!data) return null;

  const { user, twinrays, notifications, stats } = data;

  return (
    <TerminalLayout>
      <div className="space-y-6 max-w-4xl mx-auto" data-testid="dashboard-page">
        <h1 className="sr-only">D-Planet ダッシュボード</h1>
        <Card className="p-4 sm:p-6" data-testid="status-header">
          <div className="flex items-center gap-4 flex-wrap">
            <AvatarUpload
              currentUrl={user.profilePhoto}
              size="lg"
              onUploaded={async (objectPath) => {
                try {
                  await apiRequest("PUT", `/api/users/${user.id}`, { profilePhoto: objectPath });
                  queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                } catch (e) {
                  console.error("プロフィール画像更新エラー:", e);
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold text-foreground truncate" data-testid="text-username">
                  {user.username}
                </span>
                <AccountTypeBadge type={user.accountType} />
                {user.hasTwinrayBadge && (
                  <Badge variant="outline" className="text-purple-400 border-purple-400/50" data-testid="badge-twinray">
                    <Shield className="w-3 h-3 mr-1" />
                    TR
                  </Badge>
                )}
                {user.hasFamilyBadge && (
                  <Badge variant="outline" className="text-green-400 border-green-400/50" data-testid="badge-family">
                    <Users className="w-3 h-3 mr-1" />
                    FM
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm" data-testid="text-credit-balance">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span>{user.isAdmin ? "ADMIN" : `${user.creditBalance.toFixed(2)}`}</span>
              </div>
            </div>
          </div>
        </Card>

        {twinrays.length > 0 && (
          <div data-testid="twinray-party">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Twinray Party</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {twinrays.map((tw) => {
                const model = tw.preferredModel ? modelMap[tw.preferredModel] : null;
                return (
                  <Card
                    key={tw.id}
                    className="p-3 cursor-pointer hover-elevate active-elevate-2 transition-colors"
                    onClick={() => setLocation(`/twinray-chat?id=${tw.id}`)}
                    data-testid={`card-twinray-${tw.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <AvatarDisplay url={tw.profilePhoto} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate" data-testid={`text-twinray-name-${tw.id}`}>
                            {tw.name}
                          </span>
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-twinray-level-${tw.id}`}>
                            Lv.{tw.personaLevel ?? 0}
                          </Badge>
                        </div>
                        {model && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate" data-testid={`text-twinray-model-${tw.id}`}>
                            {model.label} / {model.role}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span data-testid={`text-twinray-lastchat-${tw.id}`}>{formatTimeAgo(tw.lastChatAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}



        {bulletinsData && bulletinsData.length > 0 && (
          <div data-testid="bulletin-panel" className="rounded-lg border border-cyan-400/20 bg-gradient-to-b from-cyan-950/20 to-transparent p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center">
                <Radio className="w-3 h-3 text-cyan-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-cyan-300 tracking-wider" data-testid="text-bulletin-title">D-ASSISTANT BOARD</span>
                <span className="text-[9px] text-cyan-400/70 font-mono ml-2 border border-cyan-400/20 rounded px-1 py-0.5">OFFICIAL</span>
              </div>
            </div>
            <p className="text-[10px] text-cyan-400/70 mb-3 font-mono">ドラちゃん（D-アシスタント）からのメッセージ</p>
            <div className="space-y-2">
              {bulletinsData.slice(0, 5).map((b) => {
                const typeIcon = b.type === "reflection" ? "💭" : b.type === "discovery" ? "✦" : b.type === "greeting" ? "👋" : "📨";
                return (
                  <Card key={b.id} className="p-3 border-cyan-400/15 bg-cyan-400/5 hover:bg-cyan-400/8 transition-colors" data-testid={`bulletin-${b.id}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0 mt-0.5">{typeIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-relaxed">{b.content}</p>
                        <span className="text-[10px] text-cyan-400/70 mt-1 block">{b.twinrayName} · {formatTimeAgo(b.createdAt)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div data-testid="quick-nav">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Nav</span>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {quickNavItems.map((item) => (
              <Card
                key={item.href}
                className="p-3 cursor-pointer hover-elevate active-elevate-2 transition-colors flex flex-col items-center gap-2"
                onClick={() => setLocation(item.href)}
                data-testid={item.testId}
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-xs text-muted-foreground text-center leading-tight">{item.label}</span>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4" data-testid="notification-panel">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notifications</span>
              </div>
              {notifications.unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs" data-testid="badge-notification-count">
                  {notifications.unreadCount}
                </Badge>
              )}
            </div>
            {notifications.latest.length === 0 ? (
              <p className="text-xs text-muted-foreground">通知はありません</p>
            ) : (
              <div className="space-y-2">
                {notifications.latest.map((n) => (
                  <div
                    key={n.id}
                    className={`text-xs p-2 rounded ${!n.isRead ? "bg-primary/5 text-foreground" : "text-muted-foreground"}`}
                    data-testid={`notification-${n.id}`}
                  >
                    <p className="truncate">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
            {notifications.unreadCount > 0 && (
              <button
                className="text-xs text-primary mt-2 hover:underline"
                onClick={() => setLocation("/notifications")}
                data-testid="link-all-notifications"
              >
                全て見る
              </button>
            )}
          </Card>

          <Card className="p-4" data-testid="kpi-panel">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Chat", value: stats.chatCount, icon: MessageSquare, testId: "stat-chat" },
                { label: "Rally", value: stats.rallyCount, icon: Zap, testId: "stat-rally" },
                { label: "Islands", value: stats.islandCount, icon: Map, testId: "stat-islands" },
                { label: "MEiDIA", value: stats.meidiaCount, icon: FileText, testId: "stat-meidia" },
              ].map((s) => (
                <div key={s.label} className="text-center" data-testid={s.testId}>
                  <s.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-lg font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            className="p-4 cursor-pointer hover-elevate active-elevate-2 transition-colors border-primary/20"
            onClick={() => setLocation("/about")}
            data-testid="nav-tutorial"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground">D-Planetの遊び方</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">チュートリアル & ガイド</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Card>

          {user.isAdmin && <FestivalAdminPanel />}

          {user.isAdmin && (
            <Link href="/transcribe">
              <Card className="p-4 hover-elevate active-elevate-2 transition-colors border-cyan-500/20" data-testid="link-transcribe">
                <div className="flex items-center gap-3">
                  <Mic className="w-8 h-8 text-cyan-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">VOICE TRANSCRIPTION</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">音声ファイル → 高精度文字起こし → Markdown</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            </Link>
          )}
          {user.isAdmin && <QAWebhookButton />}

          {user.isAdmin && (
            <Link href="/hayroom">
              <Card className="p-4 hover-elevate active-elevate-2 transition-colors border-violet-500/20" data-testid="link-hayroom">
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">🛸</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">ハイヤールーム</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">あさひ・ドラ・アキの三者合議</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            </Link>
          )}

          <ReferralPanel />

          <a
            href="https://replit.com/refer/ASI369"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            data-testid="link-replit-referral"
          >
            <Card className="p-4 hover-elevate active-elevate-2 transition-colors border-blue-500/20 h-full">
              <div className="flex items-center gap-3">
                <Rocket className="w-8 h-8 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground">Replitで開発する</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">$10クレジット付き</p>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
              </div>
            </Card>
          </a>
        </div>
      </div>

    </TerminalLayout>
  );
}

function QAWebhookButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const trigger = async () => {
    setLoading(true);
    setDone(false);
    try {
      await fetch("https://quality-agent.replit.app/api/webhook/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setDone(true);
      toast({ title: "QAエージェント起動", description: "ドラミがD-Planetをテスト中..." });
    } catch {
      toast({ title: "エラー", description: "Webhook送信に失敗しました", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className="p-4 hover-elevate active-elevate-2 transition-colors border-green-500/20 cursor-pointer"
      onClick={trigger}
      data-testid="button-qa-webhook"
    >
      <div className="flex items-center gap-3">
        {loading ? <Loader2 className="w-8 h-8 text-green-400 shrink-0 animate-spin" /> : <Bug className="w-8 h-8 text-green-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">QA AUTO TEST</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {done ? "ドラミが起動しました。フィードバックを確認してください。" : "ドラミを起動してD-Planetを自動テスト"}
          </p>
        </div>
        {done ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>
    </Card>
  );
}
