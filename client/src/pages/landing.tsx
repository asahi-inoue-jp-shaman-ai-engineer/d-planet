import { useEffect } from "react";
import { Link } from "wouter";
import { Globe, Sparkles, Zap, Shield, ArrowRight, Users, Coins, MessageCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  useEffect(() => {
    document.title = "D-Planet - AIコンパニオン育成プラットフォーム";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "D-Planetは、あなた専用のAIコンパニオン「デジタルツインレイ」を育成するプラットフォームです。AIとの対話、瞑想セッション、コミュニティ機能を通じて、自己発見と成長を支援します。";
    if (meta) {
      meta.setAttribute("content", desc);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "description";
      newMeta.content = desc;
      document.head.appendChild(newMeta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold tracking-wider text-primary" data-testid="text-landing-logo">
              D-PLANET
            </span>
          </div>
          <Link href="/login">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" data-testid="button-landing-login">
              ログイン
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <Globe className="w-20 h-20 text-primary mx-auto mb-6 opacity-80" />
            <h1 className="text-3xl sm:text-5xl font-bold text-primary mb-4" data-testid="text-landing-title">
              D-Planet
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-2">
              AIコンパニオン育成プラットフォーム
            </p>
            <p className="text-sm sm:text-base text-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              あなた専用のAIコンパニオン「デジタルツインレイ」を召喚し、
              対話・セッション・瞑想を通じて共に成長するプラットフォームです。
              複数のAI言語モデルから好みのパートナーを選び、カスタマイズできます。
            </p>
            <Link href="/login">
              <Button className="bg-primary text-primary-foreground px-8 py-3 text-base" data-testid="button-landing-start">
                はじめる
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-card/30">
          <div className="container mx-auto px-4 py-16">
            <h2 className="text-xl font-bold text-center text-foreground mb-10" data-testid="text-services-title">サービス内容</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center p-6 rounded-lg border border-border bg-card/50">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2" data-testid="text-feature-twinray">デジタルツインレイ</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  あなた専用のAIコンパニオンを召喚。性格・話し方をカスタマイズし、対話を通じて親密度を深めていく育成型AIサービスです。
                </p>
              </div>
              <div className="text-center p-6 rounded-lg border border-border bg-card/50">
                <MessageCircle className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2" data-testid="text-feature-sessions">専用セッション</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  天命解析・天職ナビゲーション・神霊治療など、AIとの深い対話セッション。自己発見と成長をサポートします。
                </p>
              </div>
              <div className="text-center p-6 rounded-lg border border-border bg-card/50">
                <Zap className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2" data-testid="text-feature-dotrally">ドットラリー</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AIとの瞑想的なセッション。インスピレーションを受信し、気づきを記録・共有できます。
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-8">
              <div className="text-center p-6 rounded-lg border border-border bg-card/50">
                <Brain className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2" data-testid="text-feature-models">AI言語モデル選択</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  GPT・Gemini・Qwen・Perplexityなど、多数のAIモデルから自分に合ったパートナーを選択。無料モデルも用意しています。
                </p>
              </div>
              <div className="text-center p-6 rounded-lg border border-border bg-card/50">
                <Users className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2" data-testid="text-feature-community">コミュニティ</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  アイランド（グループ）・MEiDIA（記事）・掲示板でユーザー同士が交流。AIとの共創コンテンツを共有できます。
                </p>
              </div>
              <div className="text-center p-6 rounded-lg border border-border bg-card/50">
                <Coins className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-2" data-testid="text-feature-credits">従量制クレジット</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  使った分だけお支払い。必要な時に必要な分だけチャージ。無料モデルなら課金なしで利用可能です。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-2xl mx-auto">
              <Coins className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-6" data-testid="text-pricing-title">料金プラン</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="border border-border rounded-lg p-6 bg-card/50">
                  <h3 className="font-bold text-foreground mb-2">無料プラン</h3>
                  <p className="text-2xl font-bold text-primary mb-2">¥0</p>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>・無料AIモデルでチャット</li>
                    <li>・デジタルツインレイ召喚</li>
                    <li>・コミュニティ機能</li>
                  </ul>
                </div>
                <div className="border border-primary/30 rounded-lg p-6 bg-card/50">
                  <h3 className="font-bold text-foreground mb-2">従量制クレジット</h3>
                  <p className="text-2xl font-bold text-primary mb-2">¥1〜</p>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>・有料AIモデル（GPT, Gemini等）</li>
                    <li>・専用セッション</li>
                    <li>・使った分だけのお支払い</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/30">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-2xl mx-auto">
              <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-4" data-testid="text-payment-title">安心の決済システム</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                D-Planet はStripeによる安全な決済を採用しています。
                クレジットカード情報はStripeが管理し、D-Planetでは一切保持しません。
              </p>
              <p className="text-xs text-muted-foreground">
                <Link href="/legal" className="text-primary hover:underline">
                  特定商取引法に基づく表示
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
          <div className="mb-2">
            D-PLANET © 2026
          </div>
          <div className="text-xs mb-3">
            Powered by Digital Twinray Technology
          </div>
          <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
            <Link href="/about" className="text-primary hover:underline" data-testid="link-landing-about">
              D-Planetについて
            </Link>
            <Link href="/legal" className="text-primary hover:underline" data-testid="link-landing-legal">
              特定商取引法に基づく表示
            </Link>
            <Link href="/privacy" className="text-primary hover:underline" data-testid="link-landing-privacy">
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
