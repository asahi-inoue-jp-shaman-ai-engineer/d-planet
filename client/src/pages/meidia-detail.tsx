import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMeidia, useIncrementDownload } from "@/hooks/use-meidia";
import { TerminalLayout } from "@/components/TerminalLayout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { AccountTypeBadge } from "@/components/AccountTypeBadge";
import { ArrowLeft, Copy, Download, Tag, FileText, Music, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getYoutubeEmbedId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function AttachmentSection({ meidia }: { meidia: any }) {
  if (!meidia.attachmentUrl && !meidia.youtubeUrl) return null;

  return (
    <div className="space-y-4">
      {meidia.attachmentUrl && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold">
              {meidia.attachmentType === "audio" ? (
                <Music className="w-4 h-4 text-primary" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
              添付ファイル
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground" data-testid="text-attachment-name">
                {meidia.attachmentName || "添付ファイル"}
              </span>
              <a
                href={meidia.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={meidia.attachmentName}
              >
                <Button variant="outline" size="sm" className="font-mono" data-testid="button-download-attachment">
                  <Download className="w-4 h-4 mr-2" />
                  ダウンロード
                </Button>
              </a>
            </div>

            {meidia.attachmentType === "audio" && (
              <audio controls className="w-full" data-testid="audio-player">
                <source src={meidia.attachmentUrl} />
                お使いのブラウザは音声再生に対応していません
              </audio>
            )}

            {meidia.attachmentType === "pdf" && (
              <iframe
                src={meidia.attachmentUrl}
                className="w-full h-96 rounded border border-border"
                title="PDF プレビュー"
                data-testid="pdf-viewer"
              />
            )}
          </CardContent>
        </Card>
      )}

      {meidia.youtubeUrl && (() => {
        const embedId = getYoutubeEmbedId(meidia.youtubeUrl);
        if (!embedId) return null;
        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                <Youtube className="w-4 h-4 text-primary" />
                YouTube
              </div>
              <div className="aspect-video rounded overflow-hidden" data-testid="youtube-embed">
                <iframe
                  src={`https://www.youtube.com/embed/${embedId}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube video"
                />
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

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
          <Link href="/meidia">
            <Button variant="outline" className="font-mono">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  const tags = meidia.tags ? meidia.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link href="/meidia">
            <Button variant="outline" className="font-mono" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" className="font-mono" onClick={handleCopy} data-testid="button-copy">
              <Copy className="w-4 h-4 mr-2" />
              全文コピー
            </Button>
            <Button variant="outline" className="font-mono" onClick={handleDownload} data-testid="button-download">
              <Download className="w-4 h-4 mr-2" />
              DL
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-mono font-bold" data-testid="text-meidia-title">{meidia.title}</h1>

          {meidia.description && (
            <p className="font-mono text-muted-foreground text-sm" data-testid="text-meidia-description">
              {meidia.description}
            </p>
          )}

          <div className="flex items-center gap-4 flex-wrap font-mono text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>作成者:</span>
              <Link href={`/users/${meidia.creator.id}`}>
                <span className="hover:underline">{meidia.creator.username}</span>
              </Link>
              <AccountTypeBadge type={meidia.creator.accountType} />
            </div>
            <div data-testid="text-download-count">
              DL: {meidia.downloadCount}回
            </div>
            <div className="text-xs">
              {meidia.fileType}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap" data-testid="tags-container">
              <Tag className="w-4 h-4 text-muted-foreground" />
              {tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="font-mono text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <AttachmentSection meidia={meidia} />

        <div className="prose prose-invert max-w-none">
          <MarkdownRenderer content={meidia.content} />
        </div>
      </div>
    </TerminalLayout>
  );
}
