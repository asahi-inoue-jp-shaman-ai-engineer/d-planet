import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useFeedback, useResolveFeedback } from "@/hooks/use-feedback";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bug, Lightbulb, Image, ExternalLink, CheckCircle } from "lucide-react";
import { useState } from "react";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bug }> = {
  bug: { label: "バグ報告", icon: Bug },
  feature: { label: "改善要望", icon: Lightbulb },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "未対応", variant: "destructive" },
  in_progress: { label: "対応中", variant: "default" },
  resolved: { label: "解決済み", variant: "secondary" },
  closed: { label: "クローズ", variant: "outline" },
};

export default function FeedbackDetail() {
  const params = useParams<{ id: string }>();
  const { data: report, isLoading } = useFeedback(Number(params.id));
  const resolveFeedback = useResolveFeedback();
  const { toast } = useToast();
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);

  if (isLoading) {
    return (
      <TerminalLayout>
        <div className="font-mono text-muted-foreground">読み込み中...</div>
      </TerminalLayout>
    );
  }

  if (!report) {
    return (
      <TerminalLayout>
        <div className="text-center space-y-4">
          <p className="font-mono text-muted-foreground">報告が見つかりません</p>
          <Link href="/feedback">
            <Button variant="ghost" className="font-mono">
              <ArrowLeft className="w-4 h-4 mr-2" />
              一覧に戻る
            </Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  const typeConf = TYPE_CONFIG[report.type] || TYPE_CONFIG.bug;
  const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
  const TypeIcon = typeConf.icon;

  return (
    <TerminalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/feedback">
          <Button variant="ghost" className="font-mono" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </Link>

        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 rounded bg-muted">
              <TypeIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <Badge variant="outline" className="font-mono text-xs">{typeConf.label}</Badge>
            <Badge variant={statusConf.variant} className="font-mono text-xs">{statusConf.label}</Badge>
          </div>

          <h1 className="text-2xl font-mono font-bold" data-testid="text-feedback-title">
            {report.title}
          </h1>

          <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <Link href={`/users/${report.creator.id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
              {report.creator.username}
              <AccountTypeBadge type={report.creator.accountType} />
            </Link>
            <span>{new Date(report.createdAt).toLocaleString('ja-JP')}</span>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-feedback-content">
              {report.content}
            </div>
          </CardContent>
        </Card>

        {report.screenshotUrl && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                <Image className="w-4 h-4" />
                添付スクリーンショット
              </div>
              <img
                src={`/api/objects/${report.screenshotUrl}`}
                alt="スクリーンショット"
                className="max-w-full rounded-md border border-border"
                data-testid="img-screenshot"
              />
            </CardContent>
          </Card>
        )}

        {report.adminNote && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-2">
              <div className="font-mono text-sm font-semibold text-primary">
                管理者メモ
              </div>
              <div className="font-mono text-sm whitespace-pre-wrap" data-testid="text-admin-note">
                {report.adminNote}
              </div>
            </CardContent>
          </Card>
        )}

        {report.status !== "resolved" && (
          <div className="pt-2">
            {showResolveConfirm ? (
              <Card className="border-green-500/30">
                <CardContent className="p-4 space-y-3">
                  <p className="font-mono text-sm text-foreground">
                    このフィードバックを対応済みにしますか？投稿者に通知が届きます。
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        resolveFeedback.mutate(
                          { id: Number(params.id) },
                          {
                            onSuccess: () => {
                              toast({ title: "対応済みにしました。投稿者に通知を送りました。" });
                              setShowResolveConfirm(false);
                            },
                            onError: () => {
                              toast({ title: "更新に失敗しました", variant: "destructive" });
                            },
                          }
                        );
                      }}
                      disabled={resolveFeedback.isPending}
                      className="font-mono bg-green-600 hover:bg-green-700 text-white"
                      data-testid="button-confirm-resolve"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {resolveFeedback.isPending ? "処理中..." : "対応済みにする"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowResolveConfirm(false)}
                      className="font-mono"
                      data-testid="button-cancel-resolve"
                    >
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowResolveConfirm(true)}
                className="font-mono border-green-500/50 text-green-400 hover:bg-green-500/10"
                data-testid="button-resolve"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                対応済みにする
              </Button>
            )}
          </div>
        )}

        {report.status === "resolved" && (
          <div className="flex items-center gap-2 pt-2 font-mono text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            対応済み
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
