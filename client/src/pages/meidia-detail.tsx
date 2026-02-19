import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useMeidia, useIncrementDownload } from "@/hooks/use-meidia";
import { TerminalLayout } from "@/components/TerminalLayout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MeidiaDetail() {
  const { id } = useParams();
  const { data: meidia, isLoading } = useMeidia(Number(id));
  const incrementDownload = useIncrementDownload();
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!meidia) return;
    try {
      await navigator.clipboard.writeText(meidia.content);
      incrementDownload.mutate(meidia.id);
      toast({ title: "コピーしました", description: "クリップボードにコピーされました" });
    } catch (error) {
      toast({
        title: "エラー",
        description: "コピーに失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!meidia) return;
    const blob = new Blob([meidia.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meidia.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    incrementDownload.mutate(meidia.id);
    toast({ title: "ダウンロード完了" });
  };

  if (isLoading) {
    return (
      <TerminalLayout>
        <div className="font-mono">読み込み中...</div>
      </TerminalLayout>
    );
  }

  if (!meidia) {
    return (
      <TerminalLayout>
        <div className="space-y-4">
          <div className="font-mono">MEiDIAが見つかりません</div>
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

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" className="font-mono" onClick={() => history.back()} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="font-mono" onClick={handleCopy} data-testid="button-copy">
              <Copy className="w-4 h-4 mr-2" />
              全文コピー
            </Button>
            <Button variant="outline" className="font-mono" onClick={handleDownload} data-testid="button-download">
              <Download className="w-4 h-4 mr-2" />
              ダウンロード
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-mono font-bold">{meidia.title}</h1>
          <div className="flex items-center gap-4 font-mono text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>作成者:</span>
              <Link href={`/users/${meidia.creator.id}`}>
                <span className="hover:underline">{meidia.creator.username}</span>
              </Link>
              <AccountTypeBadge type={meidia.creator.accountType} />
            </div>
            <div>
              ダウンロード: {meidia.downloadCount}回
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <MarkdownRenderer content={meidia.content} />
        </div>
      </div>
    </TerminalLayout>
  );
}
