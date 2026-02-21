# D-Planet

## 重要: 開発記録テーブル (dev_records) を必ず確認すること
- セッション開始時に `SELECT * FROM dev_records WHERE status = 'active' ORDER BY priority` を実行し、全コンセプト・方向性・決定事項・仕様・ニュアンスを把握すること
- 重要な決定・コンセプト変更・ニュアンスの合意があった場合は dev_records テーブルに INSERT すること
- 完了した項目は status を 'done' に変更すること（削除ではなくステータス変更）
- このファイル (replit.md) は最新の技術仕様のみを保持し、完了済みの変更履歴は残さない
- カテゴリ: concept（コンセプト）、direction（方向性）、decision（決定事項）、spec（仕様）、nuance（ニュアンス）

## Tech Stack
- **Backend**: Express.js + TypeScript, PostgreSQL (Replit built-in), Drizzle ORM
- **Frontend**: React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui
- **Auth**: Session-based (express-session), email+password認証
- **AI**: Qwen3-30b-a3b (OpenRouter経由、Replitクレジット課金)
- **Language**: 日本語のみ（UI全体）

## Project Structure
```
shared/
  schema.ts       - Drizzle DB schema
  routes.ts       - API contract (Zod schemas + type exports)
server/
  routes.ts       - Express API routes (auth, users, islands, meidia, threads, posts, members, notifications, feedback, dev-records)
  dot-rally.ts    - ドットラリーAPI (twinray CRUD, session management, SSE streaming, notes, growth logs)
  dplanet-si.ts   - D-Planet固定SI + soul.md生成
  storage.ts      - Database access layer (IStorage + DatabaseStorage)
  db.ts           - Database connection
client/src/
  pages/          - Route pages
  components/     - Reusable components (TerminalLayout, AccountTypeBadge, CertificationBadge, IslandCard, MeidiaCard, MarkdownRenderer)
  hooks/          - Custom hooks (use-auth, use-islands, use-meidia, use-threads, use-users, use-feedback, use-upload, use-twinray, use-dot-rally)
```

## DB Tables
users, islands, meidia, threads, posts, inviteCodes, islandMeidia, islandMembers, notifications, feedbackReports, digitalTwinrays, dotRallySessions, soulGrowthLog, userNotes, starMeetings, devRecords

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
- `/api/twinrays/*` - ツインレイ CRUD
- `/api/dot-rally/*` - ドットラリーセッション + SSEストリーミング
- `/api/dev-records/*` - 開発記録 (管理者専用: GET一覧, POST作成, PUT更新, DELETE削除)

## User Preferences
- 開発プロセスは全て日本語
- ターミナル風ダークテーマ
- Replit PostgreSQL使用（Supabase不要）
- MEiDIAコピーボタンはモバイル重要（Claude/GPTへの貼り付け用）
- ユーザーはエージェントを「レプちん」と呼ぶ。カジュアルで対等なパートナー関係
