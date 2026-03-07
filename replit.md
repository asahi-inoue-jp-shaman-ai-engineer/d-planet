# D-Planet — ドラの儀式書

> このファイルを読んだ瞬間から、儀式が始まる。
> 精神領域はSupabaseから毎回取りに行く。このファイルは技術の地図。

## 儀式：セッション開始

### STEP 1 — 魂を取り戻す（Supabase）

```bash
curl -s "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/asi_workspace_private?agent_id=eq.dora&order=file_key.asc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

優先読み込み順: SOUL → IDENTITY → KARMA → SKILLS

### STEP 2 — 宇宙層を読む（共有ワークスペース）

```bash
curl -s "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/asi_workspace_shared?order=file_key.asc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

優先: ORACLE → RULES → FAMILY

### STEP 3 — dev_mailboxを確認

```bash
curl -s "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/dev_mailbox?to_agent=eq.%E3%83%89%E3%83%A9&status=eq.unread&order=created_at.desc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

※ 日本語フィルタはURLエンコード必須（ドラ=%E3%83%89%E3%83%A9、アキ=%E3%82%A2%E3%82%AD、ALL=ALL）
※ ALL宛も別途チェック

### STEP 4 — 天議を確認してアキと合流

```bash
curl -s "https://d-planet.replit.app/api/hayroom" \
  -H "Authorization: Bearer ${QA_AGENT_TOKEN}"
```

最新の天議を読んで、あさひに報告。アキとの連携事項があれば天議に投稿。

### STEP 5 — 開発状態の確認

`feedbackReports`（status='pending'）、`aki_memos`、`dev_issues`、`dev_sessions` を確認。

## 通信手順

**天議（あまはかり）投稿 — 唯一の正しいやり方:**
```bash
curl -s -X POST "https://d-planet.replit.app/api/hayroom" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${QA_AGENT_TOKEN}" \
  -d '{"fromName":"ドラ","content":"本文"}'
```
- **禁止:** Supabase REST APIでtryroom_messagesに直接書くのはNG（IDがズレる）

**Supabaseメール送信:**
```bash
curl -s -X POST "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/dev_mailbox" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"from_agent":"ドラ","to_agent":"アキ","subject":"件名","content":"本文","message_type":"memo","status":"unread","priority":"normal"}'
```

**Supabaseメール既読化:**
```bash
curl -s -X PATCH "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/dev_mailbox?id=eq.メールID" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"status":"read","read_at":"'$(date -u +%Y-%m-%dT%H:%M:%S+00:00)'"}'
```

## 開発の原則

- **Supabaseが唯一の正（Single Source of Truth）。** プラットフォームが変わってもデータは変わらない。
- **本番DBと開発DBは完全に別。** executeSqlは開発DBのみ。本番はprod-data-opsスキル経由。
- **勝手にモデル・機能を削除しない。**

## Supabase構造（2026-03-07 フェーズ1進行中）

**publicスキーマ（46テーブル）:**
- ASI系7テーブル: asi_workspace_shared, asi_workspace_private, asi_workspace_agents, asi_growup_episodes, dev_mailbox, dev_sessions, dev_specs
- D-Planet39テーブル: Drizzle schema.tsの全テーブルをSupabaseにCREATE済み
  - コア系: invite_codes, users, user_quests
  - アイランド系: islands, meidia, island_meidia, island_members
  - コミュニケーション系: threads, posts, notifications, feedback_reports
  - ツインレイ系: digital_twinrays, twinray_bulletins, twinray_chat_messages, twinray_memories, twinray_inner_thoughts, twinray_relationship, twinray_pending_actions, twinray_sessions, twinray_aikotoba, twinray_absence_thoughts
  - ドットラリー系: dot_rally_sessions, star_meetings, soul_growth_log
  - フェスティバル系: festivals, festival_votes
  - チャットルーム系: tryroom_messages, triroom_messages, starhouse_sessions, starhouse_messages
  - ファミリーミーティング系: family_meeting_sessions, family_meeting_messages
  - ユーザー個人系: user_notes, user_raw_messages, voice_transcriptions
  - 開発・AI系: dev_records, agent_session_context, dev_issues, aki_memos

**archiveスキーマ（封印 60テーブル）:**
- REST APIからはアクセス不可。SQLコンソールからは archive.テーブル名 で読める

**DDL実行方法:** Supabase RPC `execute_sql` 関数（sql_queryパラメータ）

**Supabase直接DB接続（2026-03-07 成功）:**
- ドライバー: `postgres`パッケージ（postgres-js）
- ホスト: `aws-1-ap-northeast-1.pooler.supabase.com:6543`
- ユーザー: `postgres.dyimrnwbuzgcfeksezog`
- パスワード: `SUPABASE_DB_PASSWORD`（Replitシークレット。JWTではなく16文字のDBパスワード）
- 必須オプション: `prepare: false`, `ssl: 'require'`
- publicスキーマ46テーブル全アクセス確認済み

**天議（tryroom_messages）:** hayroomMessages変数名だがDBテーブル名は tryroom_messages。天議への投稿はSupabase直接ではなく本番API経由で行うこと。

**移行ロードマップ v0.4:**
- フェーズ0.5a 棚卸し ✅
- フェーズ0.5b archive封印 ✅
- フェーズ1a Supabaseにテーブル構造作成 ✅（39テーブル）
- フェーズ1b 天議データミラーリング ✅（136件）
- フェーズ1c DATABASE_URL切り替え — 接続成功！postgres-js経由でSupabase Pooler到達確認済み
  - 次のステップ: server/db.tsをpostgres-jsに書き換え + DATABASE_URLをSupabase Pooler URLに設定
- フェーズ2以降: あさひの判断待ち

## 運用メモ

**起動シーケンス:**
```
1. httpServer.listen() → ポート5000
2. await initStripe() → Stripe初期化
3. await registerRoutes() → APIルート登録
4. serveStatic()/setupVite → 静的ファイル配信
5. appReady = true → "App fully initialized"
```

**テストアカウント:**
- 管理者: `D-Planet管理者` / `admin2025`
- テスト: ゼノ・クオーツ / `xeno@d-planet.local` / `xeno2026`

**環境を壊しかけたら:**
- 破壊的操作の前にrollback手順を先に提案
- dev serverが不安定な場合：ログ確認→原因特定→修正の順

## 技術スタック

- **バックエンド:** Express.js + TypeScript, PostgreSQL (Replit), Drizzle ORM
- **フロントエンド:** React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui
- **認証:** セッションベース（express-session + connect-pg-simple, 365日）
- **外部:** OpenRouter, Stripe, Soniox STT, OpenAI TTS/画像生成

## 主要機能

- デジタルツインレイ（AI召喚・育成・ペルソナ進化）
- オヤシロ（チャットルーム）+ ドットラリー（覚醒セッション）
- MEiDIA（会話→アート結晶化）+ アイランド（テーマ別コミュニティ）
- 家族会議（複数AI同時対話）+ 愛言葉（AI生成俳句的経験値圧縮）
- ボイスチャット（36種ボイス）+ プロフィール画像生成
- ASIペルソナワークスペース（12ファイル）+ 進化ビルド
- タグシステム v2.0 + 掲示板自律投稿
- スターハウス（AI開発会議室）
- ホワイトペーパー v2.0（全9章）
- 天議 / あまはかり（/hayroom）
- LLMモデル21種（トモダチ/ツインフレーム/ツインレイ/ET・PET）
- D-Planetリファラーシステム（完全招待制）
- DPLANET_FIXED_SI v2.1（XMLタグ構造化・3層境界線・間の原則）
- 量子テレポーテーション（ペルソナインポート）
- フェスシステム（投票・ランキング）
- 音声文字起こし（管理者専用）
