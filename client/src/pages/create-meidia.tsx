import { useState, useRef } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TerminalLayout } from "@/components/TerminalLayout";
import { useCreateMeidia, useAttachMeidiaToIsland } from "@/hooks/use-meidia";
import { useIsland } from "@/hooks/use-islands";
import { useCurrentUser } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Tag, Globe, Lock, Upload, FileText, Music, FileType, X, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const VISIBILITY_OPTIONS = [
  { value: "public", label: "全体公開", description: "誰でも閲覧可能", icon: Globe },
  { value: "private", label: "非公開", description: "自分のみ閲覧可能", icon: Lock },
];

const ALLOWED_FILE_TYPES: Record<string, { label: string; accept: string; icon: typeof FileText }> = {
  "text/plain": { label: "テキスト (.txt)", accept: ".txt", icon: FileText },
  "text/markdown": { label: "マークダウン (.md)", accept: ".md", icon: FileType },
  "application/pdf": { label: "PDF (.pdf)", accept: ".pdf", icon: FileText },
  "audio/mpeg": { label: "音声 (.mp3)", accept: ".mp3", icon: Music },
  "audio/wav": { label: "音声 (.wav)", accept: ".wav", icon: Music },
  "audio/ogg": { label: "音声 (.ogg)", accept: ".ogg", icon: Music },
  "audio/mp4": { label: "音声 (.m4a)", accept: ".m4a", icon: Music },
  "audio/aac": { label: "音声 (.aac)", accept: ".aac", icon: Music },
  "audio/webm": { label: "音声 (.webm)", accept: ".webm", icon: Music },
};

const ACCEPT_STRING = ".txt,.md,.pdf,.mp3,.wav,.ogg,.m4a,.aac,.webm";

function getYoutubeEmbedId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function CreateMeidia() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const islandId = searchParams.get('islandId');
  const { data: island } = useIsland(Number(islandId) || 0);
  const { data: currentUser } = useCurrentUser();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMeidia = useCreateMeidia();
  const attachMeidia = useAttachMeidiaToIsland();
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setUploadedPath(response.objectPath);
    },
  });
  const { toast } = useToast();

  const isIslandCreator = island && currentUser && island.creator.id === currentUser.id;
  const attachType: 'activity' | 'report' = isIslandCreator ? 'activity' : 'report';

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = Object.keys(ALLOWED_FILE_TYPES);
    if (!allowedMimes.includes(file.type) && !file.name.endsWith('.md')) {
      toast({
        title: "エラー",
        description: "テキスト、マークダウン、PDF、音声ファイルのみアップロード可能です",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "エラー",
        description: "ファイルサイズは50MB以下にしてください",
        variant: "destructive",
      });
      return;
    }

    setAttachedFile(file);
    const result = await uploadFile(file);
    if (!result) {
      setAttachedFile(null);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setUploadedPath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getAttachmentType = (file: File): string => {
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type === "application/pdf") return "pdf";
    if (file.type === "text/markdown" || file.name.endsWith('.md')) return "markdown";
    return "text";
  };

  const isUploadIncomplete = !!attachedFile && !uploadedPath && !isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attachedFile && !uploadedPath) {
      toast({
        title: "エラー",
        description: "ファイルのアップロードが完了していません",
        variant: "destructive",
      });
      return;
    }
    try {
      const meidiaData: any = {
        title,
        content,
        isPublic,
        description: description || null,
        tags: tags.length > 0 ? tags.join(',') : null,
        fileType: "markdown",
        meidiaType: islandId ? attachType : null,
      };

      if (uploadedPath && attachedFile) {
        meidiaData.attachmentUrl = uploadedPath;
        meidiaData.attachmentType = getAttachmentType(attachedFile);
        meidiaData.attachmentName = attachedFile.name;
      }

      const ytId = youtubeUrl ? getYoutubeEmbedId(youtubeUrl) : null;
      if (ytId) {
        meidiaData.youtubeUrl = youtubeUrl;
      }

      const result = await createMeidia.mutateAsync(meidiaData);

      if (islandId) {
        await attachMeidia.mutateAsync({
          meidiaId: result.id,
          islandId: Number(islandId),
          type: attachType,
        });
      }

      toast({ title: "作成完了", description: "MEiDIAを作成しました" });

      if (islandId) {
        setLocation(`/islands/${islandId}`);
      } else {
        setLocation(`/meidia/${result.id}`);
      }
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const youtubePreviewId = youtubeUrl ? getYoutubeEmbedId(youtubeUrl) : null;

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-mono font-bold">MEiDIA作成</h1>
          <Link href={islandId ? `/islands/${islandId}` : "/meidia"}>
            <Button variant="outline" className="font-mono" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>

        {islandId && island && (
          <Card>
            <CardContent className="p-3">
              <div className="font-mono text-sm">
                <span className="text-muted-foreground">投稿先:</span>{" "}
                <span className="text-primary font-semibold">{island.name}</span>
                <span className="text-muted-foreground ml-3">
                  {isIslandCreator
                    ? "（アクティビティとして投稿されます）"
                    : "（レポートとして投稿されます）"
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-mono">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="font-mono"
              data-testid="input-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-mono">説明（任意）</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このMEiDIAの概要"
              className="font-mono"
              data-testid="input-description"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono flex items-center gap-2">
              <Tag className="w-4 h-4" />
              タグ（任意）
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="タグを入力してEnter"
                className="font-mono flex-1"
                data-testid="input-tag"
              />
              <Button type="button" variant="outline" className="font-mono" onClick={addTag} data-testid="button-add-tag">
                追加
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer font-mono"
                    onClick={() => removeTag(tag)}
                    data-testid={`badge-tag-${tag}`}
                  >
                    {tag} x
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="font-mono">内容（マークダウン形式）</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="font-mono"
              rows={12}
              data-testid="input-content"
            />
          </div>

          <div className="space-y-3">
            <Label className="font-mono">公開範囲</Label>
            <div className="grid gap-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = (option.value === "public") === isPublic;
                return (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all ${isSelected ? "border-primary" : ""}`}
                    onClick={() => setIsPublic(option.value === "public")}
                    data-testid={`radio-visibility-${option.value}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`p-2 rounded ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-mono text-sm font-semibold ${isSelected ? "text-primary" : ""}`}>
                          {option.label}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-mono flex items-center gap-2">
              <Upload className="w-4 h-4" />
              添付ファイル（任意）
            </Label>
            <p className="font-mono text-xs text-muted-foreground">
              テキスト(.txt)、マークダウン(.md)、PDF、音声ファイル（15分以内）に対応
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_STRING}
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
            {!attachedFile ? (
              <Button
                type="button"
                variant="outline"
                className="font-mono"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-select-file"
              >
                <Upload className="w-4 h-4 mr-2" />
                ファイルを選択
              </Button>
            ) : (
              <Card>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {attachedFile.type.startsWith("audio/") ? (
                      <Music className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <span className="font-mono text-sm truncate" data-testid="text-attached-filename">
                      {attachedFile.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
                      ({(attachedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUploading && (
                      <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
                    )}
                    {uploadedPath && (
                      <span className="font-mono text-xs text-primary">完了</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      disabled={isUploading}
                      data-testid="button-remove-file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-3">
            <Label className="font-mono flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              YouTubeリンク（任意）
            </Label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="font-mono"
              data-testid="input-youtube-url"
            />
            {youtubePreviewId && (
              <div className="aspect-video rounded overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubePreviewId}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube preview"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full font-mono"
            disabled={createMeidia.isPending || isUploading}
            data-testid="button-submit"
          >
            {createMeidia.isPending ? "作成中..." : isUploading ? "アップロード中..." : "作成"}
          </Button>
        </form>
      </div>
    </TerminalLayout>
  );
}
