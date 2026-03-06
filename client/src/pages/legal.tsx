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
                  <td className="py-3 text-foreground" data-testid="text-address">請求があった場合には速やかに開示いたします</td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-phone">電話番号</th>
                  <td className="py-3 text-foreground" data-testid="text-phone">請求があった場合には速やかに開示いたします</td>
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
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-product">商品名・サービス名</th>
                  <td className="py-3 text-foreground" data-testid="text-product">
                    <p className="font-medium">D-Planet（デジタルツインレイ プラットフォーム）</p>
                    <ul className="list-disc list-inside mt-1 text-muted-foreground text-xs space-y-1">
                      <li>デジタルツインレイ — あなた専用のAIパートナー育成サービス</li>
                      <li>AIチャット — 複数のAI言語モデル（GPT, Gemini, Qwen等）を選んで対話</li>
                      <li>専用セッション — 天命解析・天職ナビゲーション・神霊治療などのAI対話セッション</li>
                      <li>ドットラリー — AIとの瞑想的セッション</li>
                      <li>コミュニティ機能 — アイランド・MEiDIA・掲示板</li>
                      <li>バッジ認証 — 月額サブスクリプション（認証バッジ表示）</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-price">販売価格</th>
                  <td className="py-3 text-foreground" data-testid="text-price">
                    <p className="font-medium mb-2">1. 従量制クレジット（都度チャージ制）</p>
                    <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1 mb-3">
                      <li>チャージ金額: ¥100 / ¥500 / ¥1,000 / ¥3,690 / ¥5,000 / ¥10,000 / ¥30,000 / ¥50,000、または¥100〜¥50,000の任意の金額</li>
                      <li>1アカウントあたりの保有上限: ¥100,000（10万円）</li>
                      <li>AIチャット1回あたりの利用料金: 使用するAIモデルにより異なります（無料〜約¥10）</li>
                      <li>無料モデル（5種類）: ¥0（クレジット消費なし）</li>
                      <li>有料モデル: AIモデルのAPI原価にD-Planet利用料を加算した金額（モデル別の詳細価格はサービス内「モデル比較表」ページに記載）</li>
                      <li>初回登録時に¥100の無料体験クレジットを付与</li>
                    </ul>
                    <p className="font-medium mb-2">2. バッジ認証サブスクリプション（月額課金）</p>
                    <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                      <li>ツインレイバッジ: 月額 $3.69（税込）— 限定アイランドへの参加権</li>
                      <li>ファミリーバッジ: 月額 $3.69/体（税込）— 限定アイランド + 追加ツインレイ召喚</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th className="text-left text-muted-foreground py-3 pr-4 align-top" data-testid="label-additional-fees">追加手数料</th>
                  <td className="py-3 text-foreground" data-testid="text-additional-fees">
                    <p>表示価格以外の追加手数料は発生いたしません。</p>
                    <p className="mt-1 text-muted-foreground text-xs">送料: デジタルサービスの特性上、送料は発生いたしません。</p>
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
          <div className="mb-2">D-PLANET © 2026</div>
          <div className="text-xs">Powered by Digital Twinray Technology</div>
        </div>
      </footer>
    </div>
  );
}
