import { useEffect } from "react";
import { ArrowLeft, Scale } from "lucide-react";
import { Link } from "wouter";

export default function Legal() {
  useEffect(() => {
    document.title = "特定商取引法に基づく表示 | D-Planet";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            トップページに戻る
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-10">
          <Scale className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2" data-testid="text-legal-title">
            特定商取引法に基づく表示
          </h1>
        </div>

        <div className="space-y-6">
          <div className="border border-border rounded-lg p-6 bg-card/50">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top w-1/3" data-testid="label-seller">販売業者</th>
                  <td className="py-3 text-foreground" data-testid="text-seller">井上朝陽</td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-address">所在地</th>
                  <td className="py-3 text-foreground" data-testid="text-address">沖縄県南城市</td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-contact">連絡先</th>
                  <td className="py-3 text-foreground" data-testid="text-contact">
                    <a href="mailto:yaoyorozu369@gmail.com" className="text-primary hover:underline">
                      yaoyorozu369@gmail.com
                    </a>
                  </td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-url">URL</th>
                  <td className="py-3 text-foreground" data-testid="text-url">
                    <a href="https://d-planet.replit.app" className="text-primary hover:underline">
                      https://d-planet.replit.app
                    </a>
                  </td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-price">販売価格</th>
                  <td className="py-3 text-foreground" data-testid="text-price">
                    <p>各サービスページに表示された金額に従います。</p>
                    <ul className="list-disc list-inside mt-1 text-muted-foreground text-xs space-y-1">
                      <li>従量制クレジット: 都度チャージ制（最低チャージ額はサービスページに記載）</li>
                      <li>バッジ認証サブスクリプション: 月額 $3.69（税込）</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-payment">支払方法</th>
                  <td className="py-3 text-foreground" data-testid="text-payment">クレジットカード（Stripe決済）</td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-timing">支払時期</th>
                  <td className="py-3 text-foreground" data-testid="text-timing">
                    <p>クレジットチャージ: 購入時に即時決済</p>
                    <p>サブスクリプション: 毎月自動決済</p>
                  </td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-delivery">サービス提供時期</th>
                  <td className="py-3 text-foreground" data-testid="text-delivery">決済完了後、即時利用可能</td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-cancel">キャンセル・返品</th>
                  <td className="py-3 text-foreground" data-testid="text-cancel">
                    <p>デジタルサービスの性質上、購入後のクレジット返金はお受けしておりません。</p>
                    <p className="mt-1">サブスクリプションはいつでもキャンセル可能です。キャンセル後は次回更新日まで引き続きご利用いただけます。</p>
                  </td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-environment">動作環境</th>
                  <td className="py-3 text-foreground" data-testid="text-environment">
                    モダンブラウザ（Chrome, Safari, Firefox, Edge の最新版）
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
          <div className="mb-2">D-PLANET © 2025 - Phase 2 Alpha</div>
          <div className="text-xs">Powered by Digital Twinray Technology</div>
        </div>
      </footer>
    </div>
  );
}
