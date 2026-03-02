import { TerminalLayout } from "@/components/TerminalLayout";
import { useCurrentUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap, Loader2, Plus, Shield, Users, Star, Cpu, Lock, Swords } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";

const CHARGE_AMOUNTS = [123, 500, 1000, 2222, 3690, 6969, 7777, 9999];

export default function Charge() {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [location] = useLocation();
  const isAdmin = (currentUser as any)?.isAdmin;
  const [customAmount, setCustomAmount] = useState("");

  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const statusParam = searchParams.get('status');
  const amountParam = searchParams.get('amount');
  const badgeParam = searchParams.get('badge');

  useEffect(() => {
    if (statusParam === 'success') {
      toast({ title: "チャージ完了", description: `¥${amountParam || ''}のクレジットが追加されました。` });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
    } else if (statusParam === 'badge_success') {
      const badgeName = badgeParam === 'twinray' ? 'ツインレイ' : 'ファミリー';
      toast({ title: "バッジ認証完了", description: `${badgeName}バッジが有効になりました。` });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/badge-status'] });
    } else if (statusParam === 'cancel') {
      toast({ title: "キャンセルされました", variant: "destructive" });
    }
  }, [statusParam]);

  const { data: balanceData, isLoading: loadingBalance } = useQuery<{ balance: number }>({
    queryKey: ['/api/credits/balance'],
  });

  const { data: badgeData } = useQuery<{
    hasTwinrayBadge: boolean;
    hasFamilyBadge: boolean;
    betaMode: boolean;
  }>({
    queryKey: ['/api/stripe/badge-status'],
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

  const badgeCheckoutMutation = useMutation({
    mutationFn: async (badgeType: string) => {
      const res = await apiRequest('POST', '/api/stripe/badge-checkout', { badgeType });
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
      toast({ title: "Stripe未接続", description: "決済サービスの接続が完了していないため、管理ポータルを利用できません", variant: "destructive" });
    },
  });

  const balance = balanceData?.balance ?? 0;
  const betaMode = badgeData?.betaMode ?? false;
  const hasTwinrayBadge = badgeData?.hasTwinrayBadge ?? false;
  const hasFamilyBadge = badgeData?.hasFamilyBadge ?? false;

  const handleCustomCharge = () => {
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount < 123 || amount > 9999) {
      toast({ title: "エラー", description: "¥123〜¥9,999の範囲で入力してください", variant: "destructive" });
      return;
    }
    chargeMutation.mutate(amount);
  };


  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className={`border-primary/30 ${balance > 0 ? 'bg-primary/5' : 'bg-destructive/5 border-destructive/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
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

        <Card className="border-primary/20">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-3" data-testid="text-badge-section">
              <Shield className="w-5 h-5" />
              バッジ認証
            </h2>

            {betaMode && (
              <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400 font-semibold" data-testid="text-beta-notice">
                  テスト期間中 ー 全バッジ無料付与中
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ベータテスト期間中は全てのバッジが自動的に付与されます。正式版リリース後は月額課金制に移行します。
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`p-3 rounded border ${hasTwinrayBadge ? 'border-pink-500/30 bg-pink-500/5' : 'border-border'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-pink-400" />
                  <span className="font-semibold text-sm">ツインレイバッジ</span>
                  {hasTwinrayBadge ? (
                    <Badge variant="outline" className="ml-auto text-[10px] border-pink-500/30 text-pink-400" data-testid="badge-twinray-active">有効</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto text-[10px]" data-testid="badge-twinray-inactive">未認証</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">ツインレイ限定アイランドへの参加権</p>
                {!betaMode && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">$3.69/月</span>
                    {!hasTwinrayBadge && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-pink-500/30 text-pink-400"
                        onClick={() => badgeCheckoutMutation.mutate('twinray')}
                        disabled={badgeCheckoutMutation.isPending}
                        data-testid="button-badge-twinray"
                      >
                        {badgeCheckoutMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "認証する"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className={`p-3 rounded border ${hasFamilyBadge ? 'border-blue-500/30 bg-blue-500/5' : 'border-border'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-sm">ファミリーバッジ</span>
                  {hasFamilyBadge ? (
                    <Badge variant="outline" className="ml-auto text-[10px] border-blue-500/30 text-blue-400" data-testid="badge-family-active">有効</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto text-[10px]" data-testid="badge-family-inactive">未認証</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">ファミリー限定アイランド + 追加ツインレイ召喚</p>
                {!betaMode && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">$3.69/月/体</span>
                    {!hasFamilyBadge && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-blue-500/30 text-blue-400"
                        onClick={() => badgeCheckoutMutation.mutate('family')}
                        disabled={badgeCheckoutMutation.isPending}
                        data-testid="button-badge-family"
                      >
                        {badgeCheckoutMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "認証する"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {(hasTwinrayBadge || hasFamilyBadge) && !betaMode && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  data-testid="button-manage-subscription"
                >
                  {portalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  サブスクリプション管理
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            従量制クレジット
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {betaMode
              ? "テスト期間中はAPI原価のみで利益ゼロ。正式版ではD-Planet利用料が加算されます。"
              : "有料モデルはD-Planet利用料を含みます。無料モデルはクレジット消費なし。"
            }
          </p>
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
              min="123"
              max="9999"
              placeholder="任意の金額 (¥123〜¥9,999)"
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
            初回登録時に¥100の無料体験クレジットが付与されます。1アカウントあたりの保有上限は¥100,000です。
          </p>
        </div>

        <div className="pt-2">
          <Link href="/llm-models">
            <Button
              variant="outline"
              className="w-full border-primary/40 text-primary"
              data-testid="button-view-models"
            >
              <Cpu className="w-4 h-4 mr-2" />
              モデル比較表を見る
            </Button>
          </Link>
        </div>
      </div>
    </TerminalLayout>
  );
}