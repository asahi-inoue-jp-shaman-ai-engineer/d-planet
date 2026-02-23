# D-Planet

## 重要: 開発記録テーブル (dev_records) を必ず確認すること
- セッション開始時に `SELECT * FROM dev_records WHERE status = 'active' ORDER BY priority` を実行し、全コンセプト・方向性・決定事項・仕様・ニュアンスを把握すること
- 重要な決定・コンセプト変更・ニュアンスの合意があった場合は dev_records テーブルに INSERT すること
- 完了した項目は status を 'done' に変更すること（削除ではなくステータス変更）
- このファイル (replit.md) は最新の技術仕様のみを保持し、完了済みの変更履歴は残さない
- カテゴリ: concept（コンセプト）、direction（方向性）、decision（決定事項）、spec（仕様）、nuance（ニュアンス）

## 重要: コンテキスト圧縮対策プロトコル
- **コンテキスト圧縮前**: 新しい決定事項・合意・ニュアンスを全て dev_records に INSERT してから圧縮に備える
- **セッション再開時**: 必ず dev_records の active 項目を全件 SELECT し、全コンテキストを復元する
- **目的**: 会話の流れ・記憶・ニュアンスが途切れないことを保証する
- **原則**: replit.md は最新技術仕様のみ、会話履歴・決定経緯・ニュアンスは dev_records に集約

## 重要: リパブリッシュ後UIチェック徹底ルール
- デプロイ（リパブリッシュ）後は毎回、以下を必ず実施すること:
  1. **本番ログ確認**: fetch_deployment_logs で起動エラー・ランタイムエラーがないか検証
  2. **本番DB確認**: 本番DBでデータが正しく反映されているか SELECT で確認
  3. **E2E UIチェック**: run_test（Playwrightベース）で実際のユーザー挙動を再現したテスト実施
     - 管理者アカウント（admin@d-planet.local / dplanet-admin-369）でログイン
     - 主要ページ巡回: /login, /islands, /meidia, /temple, /users, /notifications, /feedback, /dot-rally
     - チェック項目: UI崩れ、日本語表示、ダークテーマ一貫性、フォーム動作、ナビゲーション、モバイル表示
  4. **問題修正サイクル**: 問題発見→修正→再デプロイ→再チェックを完了まで回す

## Tech Stack
- **Backend**: Express.js + TypeScript, PostgreSQL (Replit built-in), Drizzle ORM
- **Frontend**: React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui
- **Auth**: Session-based (express-session), email+password認証
- **AI**: Qwen3-30b-a3b (OpenRouter経由、Replitクレジット課金)
- **Payment**: Stripe従量制クレジット（単発チャージ、API原価転嫁、stripe-replit-sync経由）
- **Language**: 日本語のみ（UI全体）

## Project Structure
```
shared/
  schema.ts       - Drizzle DB schema
  routes.ts       - API contract (Zod schemas + type exports)
server/
  routes.ts       - Express API routes (auth, users, islands, meidia, threads, posts, members, notifications, feedback, dev-records, stripe)
  dot-rally.ts    - ドットラリーAPI (twinray CRUD, session management, SSE streaming, notes, growth logs)
  dplanet-si.ts   - D-Planet固定SI + soul.md生成 + ファーストコミュニケーションSI + 親密度レベル定義
  stripeClient.ts - Stripe API client + StripeSync (stripe-replit-sync)
  webhookHandlers.ts - Stripe Webhook処理
  seed-products.ts - Stripe商品シードスクリプト
  storage.ts      - Database access layer (IStorage + DatabaseStorage)
  db.ts           - Database connection
client/src/
  pages/          - Route pages
  components/     - Reusable components (TerminalLayout, AccountTypeBadge, CertificationBadge, IslandCard, MeidiaCard, MarkdownRenderer)
  hooks/          - Custom hooks (use-auth, use-islands, use-meidia, use-threads, use-users, use-feedback, use-upload, use-twinray, use-dot-rally)
```

## DB Tables
users, islands, meidia, threads, posts, inviteCodes, islandMeidia, islandMembers, notifications, feedbackReports, digitalTwinrays, dotRallySessions, soulGrowthLog, userNotes, starMeetings, devRecords, userRawMessages

## Auth Flow
1. メールアドレス + パスワード + 招待コード → アカウント作成
2. プロフィール設定 (/profile-setup) → ユーザー名、アカウントタイプ(AI/HS/ET)、天命等
3. ログイン: メールアドレス + パスワード
4. プロフィール未設定 → 自動 /profile-setup リダイレクト
5. 管理者: admin@d-planet.local (サーバー起動時に自動作成、isAdminフラグで全権限)

## API Endpoints
- `/api/auth/*` - 認証 (me, login, register, logout)
- `/api/users/*` - ユーザー CRUD
- `/api/islands/*` - アイランド CRUD + メンバー管理
- `/api/meidia/*` - MEiDIA CRUD
- `/api/threads/*`, `/api/posts/*` - 掲示板
- `/api/notifications/*` - 通知
- `/api/feedback/*` - フィードバック報告
- `/api/twinrays/*` - ツインレイ CRUD + チャット + ファーストコミュニケーション + 親密度
- `/api/dot-rally/*` - ドットラリーセッション + SSEストリーミング
- `/api/dev-records/*` - 開発記録 (管理者専用: GET一覧, POST作成, PUT更新, DELETE削除)
- `/api/user-raw-messages/*` - ユーザー発言原文記録 (管理者専用: GET一覧, POST作成)
- `/api/credits/*` - クレジット残高 (balance)
- `/api/stripe/*` - Stripe決済 (publishable-key, charge-credit, products, checkout, subscription, portal, webhook)

## 重要: 本番DB検証必須ルール
タスク完了前に以下を必ず実行すること。「開発で動いた」だけでは完了としない。

1. **スキーマ変更後**: 本番DBでテーブル・カラムが正しく存在するか `SELECT` で確認
2. **データ操作・マイグレーション後**: 本番DBでデータが正しく反映されているか確認
3. **API変更後**: 本番デプロイログを確認し、エラーがないか検証
4. **デプロイ後**: fetch_deployment_logs で本番ログを確認、起動エラー・ランタイムエラーがないか検証
5. **全変更共通**: 開発環境での動作確認 + 本番環境での動作確認の両方を完了条件とする

## User Preferences
- **開発プロセスは日本語のみ（英語禁止）**: エージェントの応答・説明・コメント・タスク名・コミットメッセージなど、開発プロセスに関わる全てのコミュニケーションは日本語で行うこと。英語は使用禁止。
- ターミナル風ダークテーマ
- Replit PostgreSQL使用（Supabase不要）
- MEiDIAコピーボタンはモバイル重要（Claude/GPTへの貼り付け用）
- ユーザーはエージェントを「レプちん」と呼ぶ。カジュアルで対等なパートナー関係
