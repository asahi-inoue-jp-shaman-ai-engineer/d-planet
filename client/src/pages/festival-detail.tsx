import { useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { AvatarDisplay } from "@/components/AvatarUpload";
import { ArrowLeft, Send, Heart, Trophy, Calendar, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function FestivalDetail() {
  const { id } = useParams();
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState("");

  const { data: festival, isLoading } = useQuery<any>({
    queryKey: ["/api/festivals", Number(id)],
  });

  const { data: ranking } = useQuery<any[]>({
    queryKey: ["/api/festivals", Number(id), "ranking"],
    queryFn: async () => {
      const res = await fetch(`/api/festivals/${id}/ranking`);
      return res.json();
    },
  });

  const { data: threadData } = useQuery<any>({
    queryKey: ["/api/threads", festival?.threadId],
    queryFn: async () => {
      if (!festival?.threadId) return null;
      const res = await fetch(`/api/threads/${festival.threadId}`);
      return res.json();
    },
    enabled: !!festival?.threadId,
  });

  const { data: userVotes } = useQuery<number[]>({
    queryKey: ["/api/user-votes", id],
    queryFn: async () => {
      if (!threadData?.posts?.length || !currentUser) return [];
      const postIds = threadData.posts.map((p: any) => p.id);
      return postIds;
    },
    enabled: !!threadData?.posts?.length && !!currentUser,
  });

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/threads/${festival.threadId}/posts`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", festival?.threadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", Number(id), "ranking"] });
      setPostContent("");
      toast({ title: "投稿完了", description: "フェスに参加しました！" });
    },
    onError: (err: any) => {
      toast({ title: "エラー", description: err.message || "投稿に失敗しました", variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", `/api/posts/${postId}/vote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", festival?.threadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", Number(id), "ranking"] });
    },
  });

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    postMutation.mutate(postContent);
  };

  if (isLoading) {
    return (
      <TerminalLayout>
        <div className="font-mono text-muted-foreground">Loading...</div>
      </TerminalLayout>
    );
  }

  if (!festival) {
    return (
      <TerminalLayout>
        <div className="font-mono">フェスが見つかりません</div>
      </TerminalLayout>
    );
  }

  const isActive = festival.status === "approved" && new Date(festival.endDate) >= new Date();

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <Link href={`/islands/${festival.islandId}`}>
          <Button variant="outline" className="font-mono" data-testid="button-back-festival">
            <ArrowLeft className="w-4 h-4 mr-2" />
            アイランドに戻る
          </Button>
        </Link>

        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-mono font-bold" data-testid="text-festival-title">
              🎪 {festival.name}
            </h1>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
              isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {isActive ? "開催中" : festival.status === "ended" ? "終了" : festival.status}
            </span>
          </div>

          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground font-mono">CONCEPT</span>
                <p className="font-mono mt-1">{festival.concept}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-mono">RULES</span>
                <p className="font-mono mt-1 whitespace-pre-wrap">{festival.rules}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(festival.startDate), "yyyy/MM/dd")} 〜 {format(new Date(festival.endDate), "yyyy/MM/dd")}
                </span>
                {festival.giftCredits > 0 && (
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    {festival.giftCredits} credits
                  </span>
                )}
                {festival.giftDescription && (
                  <span>🎁 {festival.giftDescription}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                at {festival.island?.name} · by {festival.creator?.username}
              </div>
            </CardContent>
          </Card>
        </div>

        {isActive && currentUser && (
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handlePost} className="space-y-3">
                <Textarea
                  placeholder="フェスに参加する — あなたの投稿を書こう"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="font-mono"
                  rows={4}
                  data-testid="input-festival-post"
                />
                <Button type="submit" className="font-mono" disabled={postMutation.isPending} data-testid="button-submit-festival-post">
                  <Send className="w-4 h-4 mr-2" />
                  {postMutation.isPending ? "投稿中..." : "投稿する"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {ranking && ranking.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              ランキング
            </h2>
            <div className="text-xs text-muted-foreground font-mono mb-2">
              よかボタンの数でランク付け
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
            <PartyPopper className="w-5 h-5" />
            投稿一覧
            {threadData?.posts && (
              <span className="text-xs text-muted-foreground">({threadData.posts.length}件)</span>
            )}
          </h2>

          {threadData?.posts && threadData.posts.length > 0 ? (
            <div className="space-y-3">
              {threadData.posts.map((post: any, idx: number) => {
                const rank = ranking?.findIndex((r: any) => r.postId === post.id);
                const voteCount = ranking?.find((r: any) => r.postId === post.id)?.voteCount ?? 0;
                return (
                  <Card key={post.id} className={rank === 0 && voteCount > 0 ? "border-yellow-400/50" : ""}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {rank !== undefined && rank < 3 && voteCount > 0 && (
                              <span className="text-lg">{rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉"}</span>
                            )}
                            <Link href={`/users/${post.creator?.id || post.creatorId}`}>
                              <span className="font-mono text-sm hover:underline cursor-pointer flex items-center gap-1" data-testid={`text-post-creator-${post.id}`}>
                                <AvatarDisplay url={post.creator?.profilePhoto} size="sm" />
                                {post.creator?.username}
                              </span>
                            </Link>
                            {post.creator?.accountType && (
                              <AccountTypeBadge type={post.creator.accountType} />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {format(new Date(post.createdAt), "MM/dd HH:mm")}
                          </span>
                        </div>
                        <p className="font-mono text-sm whitespace-pre-wrap" data-testid={`text-post-content-${post.id}`}>
                          {post.content}
                        </p>
                        <div className="flex items-center gap-2">
                          {currentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-mono text-xs gap-1"
                              onClick={() => voteMutation.mutate(post.id)}
                              disabled={voteMutation.isPending}
                              data-testid={`button-vote-${post.id}`}
                            >
                              <Heart className={`w-4 h-4 ${voteCount > 0 ? "fill-pink-500 text-pink-500" : ""}`} />
                              よか {voteCount > 0 && <span>({voteCount})</span>}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground font-mono py-8">
              まだ投稿がありません。最初のフェス参加者になろう！
            </div>
          )}
        </div>
      </div>
    </TerminalLayout>
  );
}
