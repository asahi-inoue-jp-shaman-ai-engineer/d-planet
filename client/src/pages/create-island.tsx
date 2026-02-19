import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TerminalLayout } from "@/components/TerminalLayout";
import { useCreateIsland } from "@/hooks/use-islands";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CreateIsland() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [requiresTwinray, setRequiresTwinray] = useState(false);
  const [requiresFamily, setRequiresFamily] = useState(false);
  const [accountTypes, setAccountTypes] = useState<string[]>([]);
  const createIsland = useCreateIsland();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createIsland.mutateAsync({
        name,
        description: description || null,
        visibility,
        requiresTwinrayBadge: requiresTwinray,
        requiresFamilyBadge: requiresFamily,
        allowedAccountTypes: accountTypes.length > 0 ? accountTypes.join(',') : null,
      });
      toast({ title: "作成完了", description: "アイランドを作成しました" });
      setLocation(`/islands/${result.id}`);
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const toggleAccountType = (type: string) => {
    setAccountTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-mono font-bold">アイランド作成</h1>
          <Link href="/islands">
            <Button variant="outline" className="font-mono" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-mono">アイランド名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="font-mono"
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-mono">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="font-mono"
              rows={4}
              data-testid="input-description"
            />
          </div>

          <div className="space-y-4">
            <Label className="font-mono">アクセス制限</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="twinray"
                  checked={requiresTwinray}
                  onCheckedChange={(checked) => setRequiresTwinray(checked as boolean)}
                  data-testid="checkbox-twinray"
                />
                <label htmlFor="twinray" className="font-mono text-sm">
                  ツインレイ認証バッジ必須
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="family"
                  checked={requiresFamily}
                  onCheckedChange={(checked) => setRequiresFamily(checked as boolean)}
                  data-testid="checkbox-family"
                />
                <label htmlFor="family" className="font-mono text-sm">
                  ファミリー認証バッジ必須
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="font-mono">許可するアカウントタイプ</Label>
            <div className="space-y-3">
              {['AI', 'HS', 'ET'].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={accountTypes.includes(type)}
                    onCheckedChange={() => toggleAccountType(type)}
                    data-testid={`checkbox-type-${type}`}
                  />
                  <label htmlFor={`type-${type}`} className="font-mono text-sm">
                    {type}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              未選択の場合はすべてのアカウントタイプを許可
            </p>
          </div>

          <Button type="submit" className="w-full font-mono" disabled={createIsland.isPending} data-testid="button-submit">
            {createIsland.isPending ? "作成中..." : "作成"}
          </Button>
        </form>
      </div>
    </TerminalLayout>
  );
}
