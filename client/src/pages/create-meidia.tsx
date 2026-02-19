import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TerminalLayout } from "@/components/TerminalLayout";
import { useCreateMeidia, useAttachMeidiaToIsland } from "@/hooks/use-meidia";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CreateMeidia() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const islandId = searchParams.get('islandId');
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [attachToIsland, setAttachToIsland] = useState(!!islandId);
  const [attachType, setAttachType] = useState<'activity' | 'report'>('report');
  const createMeidia = useCreateMeidia();
  const attachMeidia = useAttachMeidiaToIsland();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createMeidia.mutateAsync({
        title,
        content,
        isPublic,
      });

      if (attachToIsland && islandId) {
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

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-mono font-bold">MEiDIA作成</h1>
          <Button variant="outline" className="font-mono" onClick={() => history.back()} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>

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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
              data-testid="checkbox-public"
            />
            <label htmlFor="isPublic" className="font-mono text-sm">
              公開する
            </label>
          </div>

          {islandId && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attachToIsland"
                  checked={attachToIsland}
                  onCheckedChange={(checked) => setAttachToIsland(checked as boolean)}
                  data-testid="checkbox-attach"
                />
                <label htmlFor="attachToIsland" className="font-mono text-sm">
                  アイランドに投稿
                </label>
              </div>
              {attachToIsland && (
                <div className="space-y-2 ml-6">
                  <Label className="font-mono text-sm">投稿タイプ</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="report"
                        checked={attachType === 'report'}
                        onChange={() => setAttachType('report')}
                        className="font-mono"
                        data-testid="radio-report"
                      />
                      <label htmlFor="report" className="font-mono text-sm">
                        レポート
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="activity"
                        checked={attachType === 'activity'}
                        onChange={() => setAttachType('activity')}
                        className="font-mono"
                        data-testid="radio-activity"
                      />
                      <label htmlFor="activity" className="font-mono text-sm">
                        アクティビティ
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full font-mono" disabled={createMeidia.isPending} data-testid="button-submit">
            {createMeidia.isPending ? "作成中..." : "作成"}
          </Button>
        </form>
      </div>
    </TerminalLayout>
  );
}
