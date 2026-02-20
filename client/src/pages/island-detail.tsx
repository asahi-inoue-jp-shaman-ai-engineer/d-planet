import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useIsland, useDeleteIsland } from "@/hooks/use-islands";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCreateThread, useCreatePost } from "@/hooks/use-threads";
import { useIslandMembership, useJoinIsland, useLeaveIsland } from "@/hooks/use-members";
import { TerminalLayout } from "@/components/TerminalLayout";
import { MeidiaCard } from "@/components/MeidiaCard";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { ArrowLeft, Plus, MessageSquare, Send, Lock, Users, Shield, LinkIcon, UserPlus, UserMinus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function VisibilityLabel({ visibility }: { visibility: string }) {
  const labels: Record<string, { label: string; icon: typeof Lock }> = {
    public_open: { label: "全体公開", icon: Shield },
    members_only: { label: "メンバー限定", icon: Users },
    twinray_only: { label: "ツインレイ限定", icon: Lock },
    family_only: { label: "ファミリー限定", icon: Lock },
    private_link: { label: "秘密リンク", icon: LinkIcon },
  };
  const info = labels[visibility] || { label: visibility, icon: Shield };
  const Icon = info.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

export default function IslandDetail() {
  const { id } = useParams();
  const { data: island, isLoading, error } = useIsland(Number(id));
  const { data: currentUser } = useCurrentUser();
  const { data: membership } = useIslandMembership(Number(id));
  const joinIsland = useJoinIsland();
  const leaveIsland = useLeaveIsland();
  const deleteIsland = useDeleteIsland();
  const createThread = useCreateThread();
  const createPost = useCreatePost();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showNewThread, setShowNewThread] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [expandedThread, setExpandedThread] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const [showMembers, setShowMembers] = useState(false);

  const handleJoin = async () => {
    try {
      await joinIsland.mutateAsync(Number(id));
      toast({ title: "参加完了", description: "アイランドに参加しました" });
    } catch (error: any) {
      let message = "参加に失敗しました";
      try { message = JSON.parse(error.message.replace(/^\d+:\s*/, "")).message || message; } catch {}
      toast({ title: "エラー", description: message, variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveIsland.mutateAsync(Number(id));
      toast({ title: "退出完了", description: "アイランドから退出しました" });
    } catch (error: any) {
      let message = "退出に失敗しました";
      try { message = JSON.parse(error.message.replace(/^\d+:\s*/, "")).message || message; } catch {}
      toast({ title: "エラー", description: message, variant: "destructive" });
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim()) return;
    try {
      await createThread.mutateAsync({
        islandId: Number(id),
        title: newThreadTitle,
        firstPost: newThreadContent || undefined,
      });
      setNewThreadTitle("");
      setNewThreadContent("");
      setShowNewThread(false);
      toast({ title: "作成完了", description: "スレッドを作成しました" });
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    }
  };

  const handleReply = async (threadId: number) => {
    if (!replyContent.trim()) return;
    try {
      await createPost.mutateAsync({
        threadId,
        content: replyContent,
      });
      setReplyContent("");
      toast({ title: "投稿完了", description: "返信しました" });
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <TerminalLayout>
        <div className="font-mono">読み込み中...</div>
      </TerminalLayout>
    );
  }

  if (error) {
    return (
      <TerminalLayout>
        <div className="space-y-4">
          <div className="font-mono text-destructive">
            エラー: {error instanceof Error ? error.message : "アイランドの読み込みに失敗しました"}
          </div>
          <Link href="/islands">
            <Button variant="outline" className="font-mono">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  if (!island) {
    return (
      <TerminalLayout>
        <div className="font-mono">アイランドが見つかりません</div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link href="/islands">
            <Button variant="outline" className="font-mono" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
          <Link href={`/meidia/create?islandId=${island.id}`}>
            <Button className="font-mono" data-testid="button-create-meidia">
              <Plus className="w-4 h-4 mr-2" />
              レポート投稿
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-mono font-bold" data-testid="text-island-name">{island.name}</h1>
          {island.description && (
            <p className="font-mono text-muted-foreground">{island.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">作成者:</span>
              <Link href={`/users/${island.creator.id}`}>
                <span className="hover:underline">{island.creator.username}</span>
              </Link>
              <AccountTypeBadge type={island.creator.accountType} />
            </div>
            <VisibilityLabel visibility={island.visibility} />
            {island.totalDownloads > 0 && (
              <span className="text-muted-foreground">DL: {island.totalDownloads}</span>
            )}
            {membership?.members && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {membership.members.length}人
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser && membership && !membership.isMember && (
              <Button
                variant="outline"
                className="font-mono"
                onClick={handleJoin}
                disabled={joinIsland.isPending}
                data-testid="button-join-island"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {joinIsland.isPending ? "参加中..." : "参加する"}
              </Button>
            )}
            {currentUser && membership?.isMember && island.creator.id !== currentUser.id && (
              <Button
                variant="outline"
                className="font-mono"
                onClick={handleLeave}
                disabled={leaveIsland.isPending}
                data-testid="button-leave-island"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                {leaveIsland.isPending ? "退出中..." : "退出する"}
              </Button>
            )}
            {membership?.isMember && (
              <span className="font-mono text-xs text-primary">参加中</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="font-mono"
              onClick={() => setShowMembers(!showMembers)}
              data-testid="button-toggle-members"
            >
              <Users className="w-4 h-4 mr-2" />
              メンバー一覧
            </Button>
            {currentUser && island.creator.id === currentUser.id && (
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="button-delete-island"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </Button>
            )}
          </div>

          {showDeleteConfirm && (
            <Card className="border-destructive">
              <CardContent className="p-4 space-y-3">
                <p className="font-mono text-sm text-destructive font-semibold">
                  このアイランドを削除しますか？
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  関連するスレッド・投稿・メンバー情報もすべて削除されます。この操作は取り消せません。
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="font-mono"
                    disabled={deleteIsland.isPending}
                    onClick={async () => {
                      try {
                        await deleteIsland.mutateAsync(Number(id));
                        toast({ title: "削除完了", description: "アイランドを削除しました" });
                        setLocation("/islands");
                      } catch (err: any) {
                        toast({ title: "エラー", description: err.message, variant: "destructive" });
                      }
                    }}
                    data-testid="button-confirm-delete"
                  >
                    {deleteIsland.isPending ? "削除中..." : "削除する"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono"
                    onClick={() => setShowDeleteConfirm(false)}
                    data-testid="button-cancel-delete"
                  >
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showMembers && membership?.members && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {membership.members.length > 0 ? (
                    membership.members.map((member: any) => (
                      <Link key={member.id} href={`/users/${member.userId}`}>
                        <div className="flex items-center gap-2 p-2 rounded hover-elevate font-mono text-sm" data-testid={`link-member-${member.userId}`}>
                          <span data-testid={`text-member-name-${member.userId}`}>{member.user.username}</span>
                          <AccountTypeBadge type={member.user.accountType} />
                          {member.role === "admin" && (
                            <span className="text-xs text-primary">管理者</span>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="font-mono text-sm text-muted-foreground">メンバーはいません</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {island.activityMeidia && island.activityMeidia.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-mono font-semibold">アクティビティMEiDIA</h2>
            <div className="grid gap-4">
              {island.activityMeidia.map((m: any) => (
                <MeidiaCard key={m.id} meidia={m} />
              ))}
            </div>
          </div>
        )}

        {island.reportMeidia && island.reportMeidia.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-mono font-semibold">レポートMEiDIA</h2>
            <div className="grid gap-4">
              {island.reportMeidia.map((m: any) => (
                <MeidiaCard key={m.id} meidia={m} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-mono font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              掲示板
            </h2>
            {currentUser && (
              <Button
                variant="outline"
                className="font-mono"
                onClick={() => setShowNewThread(!showNewThread)}
                data-testid="button-new-thread"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規スレッド
              </Button>
            )}
          </div>

          {showNewThread && (
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleCreateThread} className="space-y-4">
                  <Input
                    placeholder="スレッドタイトル"
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                    required
                    className="font-mono"
                    data-testid="input-thread-title"
                  />
                  <Textarea
                    placeholder="最初の投稿内容（任意）"
                    value={newThreadContent}
                    onChange={(e) => setNewThreadContent(e.target.value)}
                    className="font-mono"
                    rows={4}
                    data-testid="input-thread-content"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="font-mono" disabled={createThread.isPending} data-testid="button-submit-thread">
                      {createThread.isPending ? "作成中..." : "作成"}
                    </Button>
                    <Button type="button" variant="outline" className="font-mono" onClick={() => setShowNewThread(false)}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {island.threads && island.threads.length > 0 ? (
            <div className="space-y-3">
              {island.threads.map((thread: any) => (
                <Card key={thread.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/threads/${thread.id}`}>
                            <span
                              className="font-mono font-semibold text-primary hover:underline cursor-pointer"
                              data-testid={`link-thread-${thread.id}`}
                            >
                              {thread.title}
                            </span>
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                            <span>{thread.creator?.username}</span>
                            {thread.creator?.accountType && (
                              <AccountTypeBadge type={thread.creator.accountType} />
                            )}
                            <span>{format(new Date(thread.createdAt), "yyyy-MM-dd HH:mm")}</span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {thread.postCount ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {expandedThread === thread.id && currentUser && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="返信を入力..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="font-mono flex-1"
                            data-testid={`input-reply-${thread.id}`}
                          />
                          <Button
                            size="icon"
                            onClick={() => handleReply(thread.id)}
                            disabled={createPost.isPending}
                            data-testid={`button-reply-${thread.id}`}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link href={`/threads/${thread.id}`}>
                          <Button variant="ghost" size="sm" className="font-mono text-xs" data-testid={`button-view-thread-${thread.id}`}>
                            詳細を見る
                          </Button>
                        </Link>
                        {currentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-mono text-xs"
                            onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}
                            data-testid={`button-quick-reply-${thread.id}`}
                          >
                            クイック返信
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-mono text-muted-foreground">スレッドがまだありません</p>
            </div>
          )}
        </div>
      </div>
    </TerminalLayout>
  );
}
