import { useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useThread, useCreatePost } from "@/hooks/use-threads";
import { useCurrentUser } from "@/hooks/use-auth";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { ArrowLeft, Send, MessageSquare, Reply } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ThreadDetail() {
  const { id } = useParams();
  const { data: thread, isLoading } = useThread(Number(id));
  const { data: currentUser } = useCurrentUser();
  const createPost = useCreatePost();
  const { toast } = useToast();

  const [replyContent, setReplyContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    try {
      await createPost.mutateAsync({
        threadId: Number(id),
        content: replyContent,
        parentPostId: replyTo,
      });
      setReplyContent("");
      setReplyTo(null);
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

  if (!thread) {
    return (
      <TerminalLayout>
        <div className="space-y-4">
          <div className="font-mono">スレッドが見つかりません</div>
          <Button variant="outline" className="font-mono" onClick={() => history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>
      </TerminalLayout>
    );
  }

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="font-mono" onClick={() => history.back()} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-mono font-bold flex items-center gap-2" data-testid="text-thread-title">
            <MessageSquare className="w-6 h-6 text-primary" />
            {thread.title}
          </h1>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Link href={`/users/${thread.creator?.id}`}>
              <span className="hover:underline">{thread.creator?.username}</span>
            </Link>
            {thread.creator?.accountType && (
              <AccountTypeBadge type={thread.creator.accountType} />
            )}
            <span>{format(new Date(thread.createdAt), "yyyy-MM-dd HH:mm")}</span>
          </div>
        </div>

        <div className="space-y-3">
          {thread.posts && thread.posts.length > 0 ? (
            thread.posts.map((post: any, index: number) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <span className="text-primary font-semibold">#{index + 1}</span>
                        <Link href={`/users/${post.creator?.id}`}>
                          <span className="hover:underline">{post.creator?.username}</span>
                        </Link>
                        {post.creator?.accountType && (
                          <AccountTypeBadge type={post.creator.accountType} />
                        )}
                        <span>{format(new Date(post.createdAt), "yyyy-MM-dd HH:mm")}</span>
                      </div>
                      {currentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-mono text-xs"
                          onClick={() => {
                            setReplyTo(post.id);
                            setReplyContent(`>>${index + 1} `);
                          }}
                          data-testid={`button-reply-to-${post.id}`}
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          返信
                        </Button>
                      )}
                    </div>
                    {post.parentPostId && (
                      <div className="text-xs text-accent font-mono">
                        返信先あり
                      </div>
                    )}
                    <div className="font-mono text-sm whitespace-pre-wrap" data-testid={`text-post-content-${post.id}`}>
                      {post.content}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="font-mono text-muted-foreground">投稿がまだありません</p>
            </div>
          )}
        </div>

        {currentUser && (
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSubmitReply} className="space-y-3">
                <div className="font-mono text-sm text-muted-foreground">
                  {replyTo ? "返信を投稿" : "新しい投稿"}
                </div>
                <Textarea
                  placeholder="投稿内容を入力..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  required
                  className="font-mono"
                  rows={4}
                  data-testid="input-post-content"
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" className="font-mono" disabled={createPost.isPending} data-testid="button-submit-post">
                    <Send className="w-4 h-4 mr-2" />
                    {createPost.isPending ? "投稿中..." : "投稿"}
                  </Button>
                  {replyTo && (
                    <Button type="button" variant="outline" className="font-mono" onClick={() => { setReplyTo(null); setReplyContent(""); }}>
                      返信解除
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </TerminalLayout>
  );
}
