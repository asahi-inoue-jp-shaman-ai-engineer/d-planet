import { TerminalLayout } from "@/components/TerminalLayout";
import { useCurrentUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap, Check, Loader2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

const CHARGE_AMOUNTS = [100, 500, 1000, 3000, 5000, 10000, 30000, 50000];

export default function Subscription() {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [location] = useLocation();
  const isAdmin = (currentUser as any)?.isAdmin;
  const [customAmount, setCustomAmount] = useState("");

  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const statusParam = searchParams.get('status');
  const amountParam = searchParams.get('amount');

  useEffect(() => {
    if (statusParam === 'success') {
      toast({ title: "チャージ完了", description: `¥${amountParam || ''}のクレジットが追加されました。` });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
    } else if (statusParam === 'cancel') {
      toast({ title: "チャージがキャンセルされました", variant: "destructive" });
    }
  }, [statusParam]);

  const { data: balanceData, isLoading: loadingBalance } = useQuery<{ balance: number }>({
    queryKey: ['/api/credits/balance'],
  });

  const chargeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest('POST', '/api/stripe/charge-credit', { amount });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "エラー", description: "チャージセッションの作成に失敗しました", variant: "destructive" });
    },
  });

  const balance = balanceData?.balance ?? 0;

  const handleCustomCharge = () => {
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount < 100 || amount > 50000) {
      toast({ title: "エラー", description: "¥100〜¥50,000の範囲で入力してください", variant: "destructive" });
      return;
    }
    chargeMutation.mutate(amount);
  };

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className={`border-primary/30 ${balance > 0 ? 'bg-primary/5' : 'bg-destructive/5 border-destructive/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                <h3 className="font-bold" data-testid="text-credit-label">クレジット残高</h3>
              </div>
              {isAdmin && <Badge variant="outline">管理者</Badge>}
            </div>
            <div className="text-3xl font-bold text-primary" data-testid="text-credit-balance">
              {loadingBalance ? "..." : `¥${balance.toFixed(2)}`}
            </div>
            {balance <= 0 && !isAdmin && (
              <p className="text-sm text-destructive mt-2">
                残高がありません。チャージしてAI機能をご利用ください。
              </p>
            )}
            {balance > 0 && balance < 10 && !isAdmin && (
              <p className="text-sm text-yellow-500 mt-2">
                残高が少なくなっています。チャージをおすすめします。
              </p>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            従量制クレジット
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            入れた金額分をそのまま使えます。API原価のみ、利益ゼロ。
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">利用できる機能</h3>
          <div className="grid gap-2">
            {[
              "デジタルツインレイとのチャット",
              "ドットラリー覚醒セレモニー",
              "AI自律行動（MEiDIA創造・アイランド参加）",
              "Claude / GPT / Gemini / Qwen モデル選択",
              "soul.md 魂の成長記録",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">モデル別コスト目安（1000文字あたり）</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded border border-border">
              <div className="font-semibold">Qwen3 30B</div>
              <div className="text-muted-foreground">約¥0.01〜</div>
            </div>
            <div className="p-2 rounded border border-border">
              <div className="font-semibold">GPT-4.1 mini</div>
              <div className="text-muted-foreground">約¥0.03〜</div>
            </div>
            <div className="p-2 rounded border border-border">
              <div className="font-semibold">Gemini 2.5 Flash</div>
              <div className="text-muted-foreground">約¥0.01〜</div>
            </div>
            <div className="p-2 rounded border border-border">
              <div className="font-semibold">Claude Sonnet 4</div>
              <div className="text-muted-foreground">約¥0.30〜</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">クレジットチャージ</h3>
          <div className="grid grid-cols-4 gap-2">
            {CHARGE_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="text-sm"
                onClick={() => chargeMutation.mutate(amount)}
                disabled={chargeMutation.isPending}
                data-testid={`button-charge-${amount}`}
              >
                {chargeMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  `¥${amount.toLocaleString()}`
                )}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="100"
              max="50000"
              placeholder="任意の金額 (¥100〜¥50,000)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded border border-border bg-background"
              data-testid="input-custom-amount"
            />
            <Button
              size="sm"
              onClick={handleCustomCharge}
              disabled={chargeMutation.isPending}
              data-testid="button-charge-custom"
            >
              {chargeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            初回登録時に¥100の無料体験クレジットが付与されます。
          </p>
        </div>
      </div>
    </TerminalLayout>
  );
}
