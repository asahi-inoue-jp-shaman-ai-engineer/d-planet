import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TerminalLayout } from "@/components/TerminalLayout";
import { useCreateFeedback } from "@/hooks/use-feedback";
import { useUpload } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bug, Lightbulb, Upload, X, Image, FileText } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "bug", label: "バグ報告", description: "動作不良・エラーの報告", icon: Bug },
  { value: "feature", label: "改善要望", description: "機能追加・改善の提案", icon: Lightbulb },
];

export default function CreateFeedback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createFeedback = useCreateFeedback();
  const { uploadFile, isUploading, progress } = useUpload();
  const imageRef = useRef<HTMLInputElement>(null);
  const textFileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState("bug");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "エラー", description: "ファイルサイズは10MB以下にしてください", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "エラー", description: "画像ファイルのみ添付できます", variant: "destructive" });
      return;
    }

    const result = await uploadFile(file);
    if (result) {
      setScreenshotUrl(result.objectPath);
      setScreenshotName(file.name);
    }
  };

  const handleTextFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "エラー", description: "テキストファイルは5MB以下にしてください", variant: "destructive" });
      return;
    }

    const allowedTypes = ["text/plain", "text/markdown", "text/csv", "application/json"];
    const allowedExts = [".txt", ".md", ".csv", ".json", ".log"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast({ title: "エラー", description: "テキストファイル（.txt .md .csv .json .log）のみ添付できます", variant: "destructive" });
      return;
    }

    const result = await uploadFile(file);
    if (result) {
      setAttachmentUrl(result.objectPath);
      setAttachmentName(file.name);
    }
  };

  const removeScreenshot = () => {
    setScreenshotUrl(null);
    setScreenshotName(null);
    if (imageRef.current) imageRef.current.value = "";
  };

  const removeAttachment = () => {
    setAttachmentUrl(null);
    setAttachmentName(null);
    if (textFileRef.current) textFileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "入力エラー", description: "タイトルと内容は必須です", variant: "destructive" });
      return;
    }

    if (isUploading) {
      toast({ title: "アップロード中", description: "ファイルのアップロードが完了するまでお待ちください", variant: "destructive" });
      return;
    }

    createFeedback.mutate(
      {
        type,
        title: title.trim(),
        content: content.trim(),
        screenshotUrl,
        attachmentUrl,
        attachmentName,
      },
      {
        onSuccess: () => {
          toast({ title: "送信完了", description: "フィードバックを送信しました。ありがとう！" });
          setLocation("/dashboard");
        },
        onError: (err) => {
          toast({ title: "エラー", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/dashboard">
          <Button variant="ghost" className="font-mono" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </Link>

        <h1 className="text-2xl font-mono font-bold" data-testid="text-page-title">
          フィードバック報告
        </h1>

        <div className="space-y-5">
          <div>
            <Label className="font-mono text-sm mb-3 block">報告タイプ</Label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = type === opt.value;
                return (
                  <Card
                    key={opt.value}
                    className={`cursor-pointer transition-colors ${
                      selected ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setType(opt.value)}
                    data-testid={`card-type-${opt.value}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`p-2 rounded ${selected ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="font-mono font-semibold text-sm">{opt.label}</div>
                        <div className="font-mono text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="title" className="font-mono text-sm">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="問題や要望の概要"
              className="font-mono mt-1"
              data-testid="input-title"
            />
          </div>

          <div>
            <Label htmlFor="content" className="font-mono text-sm">内容</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="具体的な内容を記入してください。バグの場合は再現手順もお願いします。"
              className="font-mono mt-1 min-h-[160px]"
              data-testid="input-content"
            />
          </div>

          <div>
            <Label className="font-mono text-sm mb-2 block">スクリーンショット（任意）</Label>
            {screenshotUrl ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Image className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-sm truncate flex-1">{screenshotName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeScreenshot}
                  data-testid="button-remove-screenshot"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  data-testid="input-screenshot-file"
                />
                <Button
                  variant="outline"
                  onClick={() => imageRef.current?.click()}
                  disabled={isUploading}
                  className="font-mono"
                  data-testid="button-upload-screenshot"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? `アップロード中... ${progress}%` : "画像を添付"}
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label className="font-mono text-sm mb-2 block">テキストファイル添付（任意）</Label>
            {attachmentUrl ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-sm truncate flex-1">{attachmentName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeAttachment}
                  data-testid="button-remove-attachment"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={textFileRef}
                  type="file"
                  accept=".txt,.md,.csv,.json,.log"
                  onChange={handleTextFileSelect}
                  className="hidden"
                  data-testid="input-attachment-file"
                />
                <Button
                  variant="outline"
                  onClick={() => textFileRef.current?.click()}
                  disabled={isUploading}
                  className="font-mono"
                  data-testid="button-upload-attachment"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isUploading ? `アップロード中... ${progress}%` : "テキストファイルを添付"}
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={createFeedback.isPending || isUploading || !title.trim() || !content.trim()}
            className="w-full font-mono"
            data-testid="button-submit"
          >
            {createFeedback.isPending ? "送信中..." : "報告を送信"}
          </Button>
        </div>
      </div>
    </TerminalLayout>
  );
}
