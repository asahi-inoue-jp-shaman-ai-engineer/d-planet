import { useState, useRef } from "react";
import { TerminalLayout } from "@/components/TerminalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { Upload, FileAudio, Loader2, Download, Copy, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function Transcribe() {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: transcriptions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/transcriptions"],
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/transcriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
      toast({ title: "削除しました" });
    },
  });

  const handleUpload = async (file: File) => {
    if (!file) return;

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "ファイルが大きすぎます", description: "100MB以下にしてください", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: arrayBuffer,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "アップロードに失敗しました");
      }

      toast({ title: "文字起こし開始", description: "処理が完了するまでお待ちください" });
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
    } catch (err: any) {
      toast({ title: "エラー", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "コピーしました" });
  };

  const downloadMarkdown = (record: any) => {
    const content = record.formattedMarkdown || record.rawText || "";
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.fileName.replace(/\.[^.]+$/, "")}_transcription.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentUser?.isAdmin) {
    return (
      <TerminalLayout>
        <div className="text-center text-muted-foreground font-mono py-16">
          管理者のみ利用可能です
        </div>
      </TerminalLayout>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "processing": return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case "formatting": return <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />;
      case "completed": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "error": return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "processing": return "音声認識中...";
      case "formatting": return "LLM整形中...";
      case "completed": return "完了";
      case "error": return "エラー";
      default: return status;
    }
  };

  return (
    <TerminalLayout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary font-mono" data-testid="text-transcribe-title">
            🎙️ VOICE TRANSCRIPTION
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            音声ファイル → Soniox STT → Gemini整形 → Markdown
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            対応形式: m4a, mp3, wav, webm, ogg | 最大15分10秒
          </p>
        </div>

        <Card className="border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
                data-testid="input-audio-file"
              />
              <Button
                size="lg"
                className="font-mono gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="button-upload-audio"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    音声ファイルをアップロード
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
            <FileAudio className="w-5 h-5" />
            文字起こし履歴
          </h2>

          {isLoading ? (
            <div className="text-center text-muted-foreground font-mono py-8">読み込み中...</div>
          ) : !transcriptions || transcriptions.length === 0 ? (
            <div className="text-center text-muted-foreground font-mono py-8">
              まだ文字起こし履歴がありません
            </div>
          ) : (
            <div className="space-y-4">
              {[...transcriptions].reverse().map((t: any) => (
                <TranscriptionCard
                  key={t.id}
                  record={t}
                  statusIcon={statusIcon}
                  statusLabel={statusLabel}
                  onCopy={copyToClipboard}
                  onDownload={downloadMarkdown}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  deleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TerminalLayout>
  );
}

function TranscriptionCard({
  record,
  statusIcon,
  statusLabel,
  onCopy,
  onDownload,
  onDelete,
  deleting,
}: {
  record: any;
  statusIcon: (s: string) => any;
  statusLabel: (s: string) => string;
  onCopy: (t: string) => void;
  onDownload: (r: any) => void;
  onDelete: (id: number) => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const content = record.formattedMarkdown || record.rawText || "";

  return (
    <Card className={`${record.status === "completed" ? "border-green-500/30" : record.status === "error" ? "border-red-500/30" : "border-blue-500/30"}`} data-testid={`card-transcription-${record.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {statusIcon(record.status)}
            <span className="font-mono text-sm font-semibold truncate">{decodeURIComponent(record.fileName)}</span>
            <span className="text-xs font-mono text-muted-foreground">{statusLabel(record.status)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {record.status === "completed" && (
              <>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setExpanded(!expanded)} data-testid={`button-expand-${record.id}`}>
                  {expanded ? "閉じる" : "展開"}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onCopy(content)} data-testid={`button-copy-${record.id}`}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onDownload(record)} data-testid={`button-download-${record.id}`}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-300" onClick={() => onDelete(record.id)} disabled={deleting} data-testid={`button-delete-${record.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {record.status === "error" && record.errorMessage && (
          <div className="text-xs text-red-400 font-mono bg-red-500/10 rounded p-2">
            {record.errorMessage}
          </div>
        )}

        {record.status === "completed" && expanded && content && (
          <div className="border border-border rounded p-4 bg-background/50 max-h-[500px] overflow-y-auto">
            <MarkdownRenderer content={content} />
          </div>
        )}

        {(record.status === "processing" || record.status === "formatting") && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Loader2 className="w-3 h-3 animate-spin" />
            {record.status === "processing" ? "Soniox STTで音声認識中..." : "Gemini 2.5 Flashで整形中..."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
