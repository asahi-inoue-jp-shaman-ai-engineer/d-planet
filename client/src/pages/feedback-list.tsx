import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TerminalLayout } from "@/components/TerminalLayout";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { useFeedbackList } from "@/hooks/use-feedback";
import { useCurrentUser } from "@/hooks/use-auth";
import { Plus, Search, Bug, Lightbulb, Image, FileText, ArrowLeft } from "lucide-react";

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

export default function FeedbackList() {
  const { data: user } = useCurrentUser();
  const [, setLocation] = useLocation();
  const { data: reports, isLoading } = useFeedbackList();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  if (user && !user.isAdmin) {
    setLocation("/feedback");
    return null;
  }

  const filtered = reports?.filter((r) => {
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || r.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="font-mono mb-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </Link>
            <h1 className="text-2xl font-mono font-bold" data-testid="text-page-title">
              フィードバック履歴
            </h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">
              ユーザーからの報告・要望の管理
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="検索..."
              className="font-mono pl-10"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-1">
            {[
              { value: "all", label: "すべて" },
              { value: "bug", label: "バグ" },
              { value: "feature", label: "要望" },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={filterType === opt.value ? "default" : "outline"}
                size="sm"
                className="font-mono"
                onClick={() => setFilterType(opt.value)}
                data-testid={`button-filter-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="font-mono text-muted-foreground">読み込み中...</div>
        ) : !filtered || filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-mono text-muted-foreground">
                まだ報告がありません
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => {
              const typeConf = TYPE_CONFIG[report.type] || TYPE_CONFIG.bug;
              const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.open;
              const TypeIcon = typeConf.icon;
              return (
                <Link key={report.id} href={`/feedback/${report.id}`}>
                  <Card className="hover-elevate cursor-pointer" data-testid={`card-feedback-${report.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-muted flex-shrink-0 mt-1">
                          <TypeIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold truncate" data-testid={`text-feedback-title-${report.id}`}>
                              {report.title}
                            </span>
                            <Badge variant={statusConf.variant} className="font-mono text-xs">
                              {statusConf.label}
                            </Badge>
                            {report.screenshotUrl && (
                              <Image className="w-3 h-3 text-muted-foreground" />
                            )}
                            {report.attachmentUrl && (
                              <FileText className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="font-mono text-sm text-muted-foreground line-clamp-2">
                            {report.content}
                          </p>
                          <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {report.creator.username}
                              <AccountTypeBadge type={report.creator.accountType} />
                            </span>
                            <span>{new Date(report.createdAt).toLocaleDateString('ja-JP')}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
