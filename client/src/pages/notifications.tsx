import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/use-notifications";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Bell, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  const getNotificationLink = (notification: any): string | null => {
    if (notification.relatedType === "island" && notification.relatedId) {
      return `/islands/${notification.relatedId}`;
    }
    if (notification.relatedType === "user" && notification.relatedId) {
      return `/users/${notification.relatedId}`;
    }
    if (notification.relatedType === "meidia" && notification.relatedId) {
      return `/meidia/${notification.relatedId}`;
    }
    if (notification.relatedType === "festival" && notification.relatedId) {
      return `/festivals/${notification.relatedId}`;
    }
    return null;
  };

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/islands">
              <Button variant="outline" className="font-mono" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
            </Link>
            <h1 className="text-2xl font-mono font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              通知
            </h1>
            {unreadCount > 0 && (
              <span className="text-sm font-mono text-muted-foreground">
                ({unreadCount}件未読)
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="font-mono"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              全て既読
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="font-mono text-muted-foreground">読み込み中...</div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification: any) => {
              const link = getNotificationLink(notification);
              const content = (
                <Card className={`${!notification.isRead ? "border-primary/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className={`font-mono text-sm ${!notification.isRead ? "font-semibold" : "text-muted-foreground"}`}
                           data-testid={`text-notification-${notification.id}`}>
                          {notification.message}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {format(new Date(notification.createdAt), "yyyy-MM-dd HH:mm")}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markRead.mutate(notification.id);
                          }}
                          disabled={markRead.isPending}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );

              if (link) {
                return (
                  <Link key={notification.id} href={link} onClick={() => {
                    if (!notification.isRead) markRead.mutate(notification.id);
                  }}>
                    {content}
                  </Link>
                );
              }
              return <div key={notification.id}>{content}</div>;
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-mono text-muted-foreground">通知はありません</p>
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
