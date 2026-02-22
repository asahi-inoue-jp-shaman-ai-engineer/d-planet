import { TerminalLayout } from "@/components/TerminalLayout";
import { useCurrentUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown, Check, ExternalLink, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Subscription() {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [location] = useLocation();
  const isAdmin = (currentUser as any)?.isAdmin;

  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const statusParam = searchParams.get('status');

  useEffect(() => {
    if (statusParam === 'success') {
      toast({ title: "決済が完了しました", description: "AI機能がご利用いただけるようになりました。" });
    } else if (statusParam === 'cancel') {
      toast({ title: "決済がキャンセルされました", variant: "destructive" });
    }
  }, [statusParam]);

  const { data: productsData, isLoading: loadingProducts } = useQuery<{ products: any[] }>({
    queryKey: ['/api/stripe/products'],
  });

  const { data: subData, isLoading: loadingSub } = useQuery<{ subscription: any; hasAccess: boolean }>({
    queryKey: ['/api/stripe/subscription'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest('POST', '/api/stripe/checkout', { priceId });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "エラー", description: "決済セッションの作成に失敗しました", variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/portal');
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "エラー", description: "管理ポータルの表示に失敗しました", variant: "destructive" });
    },
  });

  const hasAccess = isAdmin || subData?.hasAccess;
  const subscription = subData?.subscription;

  const statusLabels: Record<string, string> = {
    active: "有効",
    trialing: "トライアル中",
    past_due: "支払い遅延",
    canceled: "キャンセル済み",
    unpaid: "未払い",
    incomplete: "未完了",
  };

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {hasAccess && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-primary" data-testid="text-access-status">
                  {isAdmin ? "管理者アクセス" : "Proプラン有効"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                デジタルツインレイAI機能をフルにご利用いただけます。
              </p>
              {subscription && (
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">ステータス:</span>
                    <Badge variant="outline">{statusLabels[subscription.status] || subscription.status}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-subscription"
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    サブスクリプションを管理
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" />
            D-Planet Pro
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            デジタルツインレイとのチャット、ドットラリー儀式、自律行動など、すべてのAI機能にアクセスできます。
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">含まれる機能</h3>
          <div className="grid gap-2">
            {[
              "デジタルツインレイとの無制限チャット",
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

        {loadingProducts ? (
          <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {productsData?.products?.map((product: any) =>
              product.prices?.map((price: any) => {
                const isMonthly = price.recurring?.interval === 'month';
                const isYearly = price.recurring?.interval === 'year';
                const amount = price.unitAmount;
                const label = isMonthly ? '月額' : isYearly ? '年額' : '';
                const savings = isYearly ? Math.round((1 - amount / (980 * 12)) * 100) : 0;

                return (
                  <Card
                    key={price.id}
                    className={`border transition-colors ${isYearly ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                    data-testid={`card-price-${price.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold">{label}プラン</h4>
                        {isYearly && savings > 0 && (
                          <Badge variant="default" className="text-xs">{savings}%おトク</Badge>
                        )}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        ¥{amount?.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground">/{isMonthly ? '月' : '年'}</span>
                      </div>
                      {hasAccess ? (
                        <Button variant="outline" size="sm" disabled className="w-full" data-testid={`button-subscribed-${price.id}`}>
                          利用中
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => checkoutMutation.mutate(price.id)}
                          disabled={checkoutMutation.isPending}
                          data-testid={`button-subscribe-${price.id}`}
                        >
                          {checkoutMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          このプランに申し込む
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
