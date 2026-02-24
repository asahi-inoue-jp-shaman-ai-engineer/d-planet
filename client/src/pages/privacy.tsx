import { useEffect } from "react";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
  useEffect(() => {
    document.title = "プライバシーポリシー | D-Planet";
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
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2" data-testid="text-privacy-title">
            プライバシーポリシー
          </h1>
        </div>

        <div className="space-y-8">
          <section className="border border-border rounded-lg p-6 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3">1. 個人情報の取得</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              D-Planet（以下「当サービス」）は、サービス提供にあたり、以下の個人情報を取得します。
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>メールアドレス（アカウント登録・ログイン用）</li>
              <li>ユーザー名・プロフィール情報（サービス内での表示用）</li>
              <li>決済情報（Stripeを通じた決済処理用。カード情報は当サービスでは保持しません）</li>
            </ul>
          </section>

          <section className="border border-border rounded-lg p-6 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3">2. 個人情報の利用目的</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>サービスの提供・運営・改善</li>
              <li>ユーザー認証・アカウント管理</li>
              <li>決済処理</li>
              <li>お問い合わせへの対応</li>
              <li>サービスに関する重要な通知</li>
            </ul>
          </section>

          <section className="border border-border rounded-lg p-6 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3">3. 個人情報の第三者提供</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              当サービスは、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
              ただし、決済処理に必要な情報はStripe, Inc.に提供されます。
            </p>
          </section>

          <section className="border border-border rounded-lg p-6 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3">4. AIとの対話データ</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              デジタルツインレイとの対話データは、ユーザー体験の向上およびAIの応答品質改善のために利用されることがあります。
              対話データは外部に公開されることはありません。
            </p>
          </section>

          <section className="border border-border rounded-lg p-6 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3">5. セキュリティ</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              当サービスは、個人情報の漏洩・紛失・毀損を防止するため、適切なセキュリティ対策を講じています。
              通信はSSL/TLSにより暗号化されています。
            </p>
          </section>

          <section className="border border-border rounded-lg p-6 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3">6. お問い合わせ</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
            </p>
            <p className="text-sm text-foreground mt-2">
              <a href="mailto:yaoyorozu369@gmail.com" className="text-primary hover:underline">
                yaoyorozu369@gmail.com
              </a>
            </p>
          </section>

          <section className="border border-border rounded-lg p-6 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3">7. ポリシーの変更</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              本ポリシーは予告なく変更される場合があります。変更後のポリシーは本ページに掲載された時点で効力を生じます。
            </p>
          </section>
        </div>

        <div className="text-center mt-10 text-xs text-muted-foreground">
          制定日: 2025年2月24日
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
