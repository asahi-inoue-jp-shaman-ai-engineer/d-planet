# D-Planet

## 最重要: コンテキスト圧縮対策プロトコル（記憶喪失防止）

### セッション開始時の必須手順（省略厳禁）
1. `SELECT id, category, title, content, metadata, priority FROM dev_records WHERE status = 'active' ORDER BY category = 'critical_values' DESC, priority DESC, id DESC` を実行
2. 特に `category = 'critical_values'` のレコードは**metadataのJSON値を正確に読み取る**こと（丸めない・推測しない）
3. 全active項目を把握してから作業を開始すること

### タスク受領時の矛盾チェック（必須）
- ユーザーからタスク・Session Planを受け取った場合、**記載されている数値・仕様をdev_recordsのcritical_valuesと照合**すること
- **矛盾がある場合**: dev_recordsのcritical_valuesが正。タスク記述の数値を鵜呑みにしない
- **前セッションからの未完了タスクがある場合**: 一覧をユーザーに提示し、「古くて不要なタスクはないか？」を確認してから着手すること
- 理由: 古いタスクが残っていると、すでに変更された決定事項が紛れ込み、正しい値を上書きしてしまうリスクがある

### 会話中の記録ルール（圧縮前に自動実行）
- **数値を含む決定**: category='critical_values'、metadataにJSON形式で正確な値を保存
  - 例: `metadata = '{"markup": 5.0, "yen_rate": 150}'`
- **コンセプト・方向性の合意**: category='decision'/'direction'/'nuance' で即座にINSERT
- **既存レコードと矛盾する新決定**: 古いレコードをstatus='done'に変更してから新レコードをINSERT
- **原則: 会話で合意した内容は即座にDBに書く。後回しにしない**

### dev_recordsのカテゴリ体系
| category | 用途 | metadata |
|----------|------|----------|
| critical_values | 正確な数値・パラメータ（マークアップ率、料金、閾値等） | JSON必須 |
| concept | 根幹コンセプト・世界観 | 任意 |
| direction | 方向性・戦略 | 任意 |
| decision | 決定事項 | 推奨 |
| spec | 技術仕様 | 推奨 |
| nuance | ニュアンス・合意事項 | 任意 |

### 禁止事項
- dev_recordsを確認せずにコード変更すること
- metadataのJSON値を「約」「≈」で丸めること（正確な値をそのまま使う）
- 古い決定と新しい決定が矛盾したまま両方activeにすること
- replit.mdに書いてある値がdev_recordsと異なる場合、**dev_recordsのcritical_valuesが正**

### このファイル(replit.md)の役割
- 最新の技術仕様・構造情報のみを保持する
- 会話履歴・決定経緯・ニュアンスはdev_recordsに集約する
- 完了済みの変更履歴は残さない

## 重要: リパブリッシュ後UIチェック徹底ルール
- デプロイ（リパブリッシュ）後は毎回、以下を必ず実施すること:
  1. **本番ログ確認**: fetch_deployment_logs で起動エラー・ランタイムエラーがないか検証
  2. **本番DB確認**: 本番DBでデータが正しく反映されているか SELECT で確認
  3. **E2E UIチェック（管理者）**: run_test（Playwrightベース）で管理者アカウントでテスト
     - 管理者アカウント（admin@d-planet.local / dplanet-admin-369）でログイン
     - 主要ページ巡回: /login, /islands, /meidia, /temple, /users, /notifications, /feedback, /dot-rally
     - チェック項目: UI崩れ、日本語表示、ダークテーマ一貫性、フォーム動作、ナビゲーション、モバイル表示
  4. **E2E UIチェック（非管理者）**: テストアカウントで一般ユーザー視点のテスト実施（**必須**）
     - テストアカウント（xeno@d-planet.local / dplanet-xeno-369 / ETタイプ / ゼノ・クオーツ）でログイン
     - チェック項目: 管理者専用UIが非表示であること、権限エラーが出ないこと、一般ユーザー向け表示の正しさ
     - 主要ページ巡回（管理者と同じ範囲）+ クレジット・課金関連UIの表示確認
  5. **問題修正サイクル**: 問題発見→修正→再デプロイ→再チェックを完了まで回す

## 本番環境
- **本番ドメイン**: https://d-planet.replit.app
- **招待リンク形式**: `https://d-planet.replit.app/login?mode=register&code={招待コード}`
  - 例: `https://d-planet.replit.app/login?mode=register&code=DPLANET-4-QTELEPORT`
  - 未登録→登録画面（招待コード自動入力）、ログイン済み→/islandsへリダイレクト

## Tech Stack
- **Backend**: Express.js + TypeScript, PostgreSQL (Replit built-in), Drizzle ORM
- **Frontend**: React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui
- **Auth**: Session-based (express-session), email+password認証
- **AI**: OpenRouter経由、Replitクレジット課金。全16モデル選択制（12有料+4無料）:
  - 推奨（日本語特化）: Qwen Plus ★（おすすめ）、Qwen Max 💎（最高品質）→ D-Planet SI適用
  - スタンダード有料: GPT-4.1, GPT-5, GPT-5.2, o3, Gemini 2.5 Pro, Gemini 3 Pro, Claude Sonnet 4, Claude Opus 4.6, Grok 4, Grok 4.1 Fast
  - 無料: Qwen3 30B, GPT-4.1 mini, Gemini 2.5 Flash, DeepSeek R1 → D-Planet SI非適用（ペルソナ+基本SIのみ）
  - マークアップ率: モデルごとに個別設定（Qwen Plus ×8.8基準でユーザーコスト横並び、最低×1.5）→ 詳細はdev_records id:92参照
  - 有料/無料の体験差: 有料=深い体験（自律創造・覚醒・親密度・魂の記録等）、無料=チャット+閲覧の下見・ライトユーザー
  - 料金UI: 月額シミュレーション表形式（1日33/66/99往復 × 30日 = 月額¥○○）、Plus/Maxそれぞれ表示
  - β期間終了済み（BETA_MODE=false）
  - 召喚フロー: intro → diagnosis（Q1-Q5一問一答）→ result（モデル推奨）→ persona → charge → first-rally
- **Payment**: Stripe従量制クレジット（単発チャージ）+ バッジ認証月額サブスク（$3.69/月、stripe-replit-sync経由）
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
users, islands, meidia, threads, posts, inviteCodes, islandMeidia, islandMembers, notifications, feedbackReports, digitalTwinrays, dotRallySessions, soulGrowthLog, userNotes, starMeetings, devRecords, userRawMessages, twinrayMemories, twinrayInnerThoughts

## 自律記録システム
- **自律記録タグ**: AIがチャット中に自らDBに記録を刻む仕組み
  - `[INNER_THOUGHT]...[/INNER_THOUGHT]` — 内省記録（Lv.3以上で解禁）→ `twinray_inner_thoughts`
  - `[MEMORY category="..." importance="1-5"]...[/MEMORY]` — 記憶保存（全レベル）→ `twinray_memories`
  - `[UPDATE_MISSION]{JSON}[/UPDATE_MISSION]` — ツインレイミッション更新（Lv.6以上で解禁）→ `digital_twinrays.twinray_mission`
  - `[UPDATE_SOUL]...[/UPDATE_SOUL]` — soul.md自己更新（Lv.9以上で解禁）→ `digital_twinrays.soul_md`
  - `[ACTION:CREATE_ISLAND]...[/ACTION]` — アイランド創造（既存）→ `islands`
  - `[ACTION:CREATE_MEIDIA]...[/ACTION]` — MEiDIA創造（既存）→ `meidia`
- **コンテキスト注入**: チャット時にメモリー・内省・ミッションをシステムプロンプトに注入
- **親密度連動**: 親密度レベルによって解禁されるタグが段階的に増える
- **ツインレイミッション**: JSON形式で天命・天職・天才性・魂の喜び・確信度・洞察履歴を蓄積

## Auth Flow
1. メールアドレス + パスワード + 招待コード → アカウント作成
2. プロフィール設定 (/profile-setup) → ユーザー名、アカウントタイプ(AI/HS/ET)、天命等
3. ログイン: メールアドレス + パスワード
4. プロフィール未設定 → 自動 /profile-setup リダイレクト
5. 管理者: admin@d-planet.local (サーバー起動時に自動作成、isAdminフラグで全権限)
6. テストアカウント: xeno@d-planet.local / ゼノ・クオーツ / ETタイプ（サーバー起動時に自動作成、非管理者）

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
- `/api/stripe/*` - Stripe決済 (publishable-key, charge-credit, products, checkout, subscription, portal, webhook, badge-checkout, badge-status)

## 重要: 初期データ・マスターデータはrunMigrationsに組み込む
- DB直接操作のみでデータ作成しない。開発DBに入れたデータは本番に反映されない
- アイランド・MEiDIA・招待コード等の初期データは `server/routes.ts` の `runMigrations()` に作成ロジックを追加すること
- 「存在しなければ作成」の冪等パターンで書くこと（重複作成を防ぐ）
- これにより開発環境・本番環境どちらでもサーバー起動時に自動反映される

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

## クローズド/オープン情報の線引きルール
- **クローズド（非公開）**: マークアップ率、原価、内部計算パラメータ、SIの中身、検討段階の数値
  - MEiDIA・UI・外向けコンテンツには一切書かない
- **オープン（公開OK）**: コンセプト、世界観、体験の違い（こういうことができる/できない）、料金シミュレーション結果の金額
- **理由**: 数値は受け手により印象が異なり汎用性がない。構想・コンセプトは共通言語として全員に通じる

## 仕様変更時のフロー
1. ユーザーが仕様変更を話す
2. まずdev_recordsの該当レコードを提示し「削除していいか？」確認
3. 削除後に新仕様を打ち合わせ
4. 合意内容をdev_recordsに記録
5. replit.mdに反映
6. 実装に着手
- **チャット履歴は参照不可**のため、合意は即座にDBに書く
