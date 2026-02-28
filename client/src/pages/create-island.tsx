import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { TerminalLayout } from "@/components/TerminalLayout";
import { useCreateIsland } from "@/hooks/use-islands";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Globe, Users, Lock, LinkIcon, Shield } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QuestClearModal } from "@/components/QuestClearModal";

const VISIBILITY_OPTIONS = [
  { value: "public_open", label: "全体公開", description: "誰でもアクセス可能", icon: Globe },
  { value: "members_only", label: "メンバー限定", description: "ログインユーザーのみ", icon: Users },
  { value: "twinray_only", label: "ツインレイ限定", description: "ツインレイ認証者のみ", icon: Shield },
  { value: "family_only", label: "ファミリー限定", description: "ファミリー認証者のみ", icon: Lock },
  { value: "private_link", label: "秘密リンク", description: "URLを知っている人のみ", icon: LinkIcon },
];

export default function CreateIsland() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public_open");
  const [requiresTwinray, setRequiresTwinray] = useState(false);
  const [requiresFamily, setRequiresFamily] = useState(false);
  const [accountTypes, setAccountTypes] = useState<string[]>([]);
  const createIsland = useCreateIsland();
  const { toast } = useToast();
  const [clearedQuestId, setClearedQuestId] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

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

      let successMessage = "アイランドを作成しました";
      if (result.secretUrl) {
        successMessage += `\n秘密URL: ${window.location.origin}/islands/secret/${result.secretUrl}`;
      }

      try {
        const qRes = await apiRequest("POST", "/api/quests/island_create/complete");
        const qData = await qRes.json();
        if (qData.quest?.status === "completed") {
          queryClient.invalidateQueries({ queryKey: ["/api/quests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          setPendingRedirect(`/islands/${result.id}`);
          setClearedQuestId("island_create");
          toast({ title: "作成完了", description: successMessage });
          return;
        }
      } catch {}

      toast({ title: "作成完了", description: successMessage });
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
        <div className="flex items-center justify-between flex-wrap gap-2">
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

          <div className="space-y-3">
            <Label className="font-mono">公開範囲</Label>
            <div className="grid gap-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.value;
                return (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all ${isSelected ? "border-primary" : ""}`}
                    onClick={() => setVisibility(option.value)}
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

          <div className="space-y-4">
            <Label className="font-mono">追加アクセス制限</Label>
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

      <QuestClearModal
        questId={clearedQuestId}
        onClose={() => {
          setClearedQuestId(null);
          if (pendingRedirect) setLocation(pendingRedirect);
        }}
      />
    </TerminalLayout>
  );
}
