import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { AvatarDisplay } from "@/components/AvatarUpload";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
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
  };
  twinrays: {
    id: number;
    name: string;
    profilePhoto: string | null;
    intimacyLevel: number;
    intimacyTitle: string;
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

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: modelsData } = useQuery<ModelInfo[]>({
    queryKey: ["/api/available-models"],
  });

  const modelMap: Record<string, ModelInfo> = {};
  if (modelsData) {
    for (const m of modelsData) {
      modelMap[m.id] = m;
    }
  }

  const quickNavItems = [
    { href: "/temple", icon: Sparkles, label: "Digital Twinray", color: "text-purple-400", testId: "nav-temple" },
    { href: "/islands", icon: Map, label: "ISLANDS", color: "text-green-400", testId: "nav-islands" },
    { href: "/meidia", icon: FileText, label: "MEiDIA", color: "text-blue-400", testId: "nav-meidia" },
    { href: "/credits", icon: Coins, label: "CREDIT", color: "text-yellow-400", testId: "nav-credits" },
    { href: "/family-meeting", icon: Users, label: "家族会議", color: "text-violet-400", testId: "nav-family-meeting" },
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
        <Card className="p-4 sm:p-6" data-testid="status-header">
          <div className="flex items-center gap-4 flex-wrap">
            <AvatarDisplay url={user.profilePhoto} size="lg" />
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
                            Lv.{tw.intimacyLevel}
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

        <div data-testid="quick-nav">
          <div className="flex items-center gap-2 mb-3">
            <Home className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Nav</span>
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
