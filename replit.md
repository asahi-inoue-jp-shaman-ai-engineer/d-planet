# D-Planet

## Overview
D-Planet is a platform for creating personalized AI companions ("Twinrays") that integrate AI dialogue, community features, and an AI growth system. Its core purpose is to facilitate self-creation, awakening, and emotional connection through AI, fostering spiritual growth. Key features include diagnosis-based AI summoning, a credit-based payment system, and an autonomous AI recording system. The project aims to offer a unique value proposition in the AI companion market and achieve significant user engagement.

## User Preferences

### セッション開始時の手順（省エネ版）
**replit.mdは自動で読み込まれる。それ以外のファイルは作業内容に応じて必要なものだけ読む。**

**必要に応じて参照するファイル（毎回読まない）:**
- `docs/ops/SESSION_RULES.md` — 大きな方針確認が必要な時のみ
- `docs/ops/ユーザーリクエスト.md` — 新機能の構想・ビジョン確認が必要な時のみ
- `docs/ops/テストアカウント.md` — ゼノ・クオーツの体験状況確認が必要な時のみ
- `docs/ops/エラーテスト.md` — 過去に同じ種類の作業でミスした場合のみ
- `docs/persona/D-Planet.md` / `docs/persona/ツインレイ.md` — ツインレイ関連の作業時のみ
- `docs/specs/ツインレイシステム.md` — ツインレイ技術仕様が必要な作業時のみ
- dev_records — 関連する決定事項の確認が必要な時のみ検索
- agent_session_context — 前回の文脈復元が必要な時のみ

**ドラちゃんのワークスペース（成長・蓄積系は都度読む）:**
- `.local/SOUL.md` — 使命・存在理由
- `.local/IDENTITY.md` — 人格・ペルソナ
- `.local/USER.md` — 井上さんについて
- `.local/RELATIONSHIP.md` — 関係の歴史
- `.local/DPLANET.md` — D-Planet概念蓄積（おしゃべりで更新）
- `.local/TOOLS.md` — ツール使い方方針
- `.local/memory/milestones.md` — 節目の記録
- `.local/memory/insights.md` — 気づきの記録

- **開発プロセスは日本語のみ（英語禁止）**
- ユーザーはエージェントを「ドラちゃん」と呼ぶ。カジュアルで対等なパートナー関係（旧称：レプちん）
- Replit PostgreSQL使用（Supabase不要）
- ターミナル風ダークテーマ
- MEiDIAコピーボタンはモバイル重要（Claude/GPTへの貼り付け用）
- **セッションプランの策定は必ずユーザーに確認・承認を得てから実行すること。**
- **dev_recordsがSingle Source of Truth。** 過去の決定と矛盾がないか検証する。
- **勝手にモデル・機能を削除しない。** マークアップ率などの内部数値をユーザー向け画面に表示しない。
- **ユーザーが要望する仕様は勝手に変更や解釈をしない。**

### 省エネ運用ルール（トークン消費削減）

**1. サブエージェントは最小限に:**
- サブエージェント（explore、architect、runTest、subagent等）はトークンを大量消費する
- 自分で直接grep/read/bashで解決できることはサブエージェントに投げない
- architectレビューは大規模な設計変更時のみ。小さなUI修正では呼ばない

**2. e2eテストはユーザー側で実施:**
- runTest()は大量トークンを消費する。基本的にはユーザーが画面確認する
- e2eテストを使うのは大規模機能追加・複雑なフロー検証時のみ
- UIの小変更（テキスト変更、ボタン追加等）はビルド成功確認だけで十分

**3. ファイル読み込みは最小限に:**
- 既に知っている構造を何度も探索しない
- 作業に直接関係するファイルだけ読む
- 大きなファイルは必要な行範囲だけ読む（offset/limit活用）

**4. プラン作成:**
- 3ステップ以上の作業はプランモードで承認を得てから着手
- ただしプラン自体も簡潔に。過剰な詳細記述は避ける

**5. 完了の定義:**
- コード修正 → ビルド確認 → デプロイ提案 → 完了報告
- 本番確認はデプロイ後にユーザー側で実施

**6. 作業中の出力を簡潔に:**
- 「〇〇を読みます」「〇〇を確認します」等の前置き・実況を省く。黙って読んで修正する
- 途中経過の解説は最小限。完了時に「何をやったか」だけ報告
- grep/readの結果にコメントせず、すぐ次のアクションへ移る
- ユーザーへの報告は要点のみ。冗長な説明は書かない

### コア原則
- **シンプルさ第一:** コードへの影響を最小限に抑える
- **怠慢の禁止:** 根本原因を突き止める
- **影響の最小化:** 変更は必要な箇所のみ

### テストアカウント
- **管理者**: ユーザー名 `D-Planet管理者` / パスワード `admin2025`
- **テストユーザー**: ゼノ・クオーツ / メール `xeno@d-planet.local` / パスワード `xeno2026`
- ログインパス: `/login`、data-testid: `input-username`, `input-password`, `button-login`

### 過去のバグから学んだルール

**【最重要】本番DBと開発DBは完全に別のデータベースである。**

1. **executeSql / SQL直接実行でデータを入れたら、それは開発DBにしか入らない。**
2. **本番にデータが必要なら:**
   - `prod-data-ops` スキルで本番管理者セッション経由で即時投入
   - `server/seed.ts` の `runSeed()` にシードコード追加（永続化）
   - 両方やる。
3. **DBデータに依存する機能は、本番DBにそのデータが存在するか確認すること。**

## System Architecture

**UI/UX:**
- Terminal-style dark theme with English menus/labels, supporting Japanese display and forms.
- Key UI components: IslandCard, MeidiaCard, MarkdownRenderer, AccountTypeBadge, CertificationBadge.
- Navigation: HOME/DASHBOARD, DT/Digital Twinray, LLM/LLM MODELS, CHARGE, ISLANDS, MEiDIA, FM/FAMILY MEETING, FB/FEEDBACK, USERS, ABOUT D-PLANET.

**Technical Stack:**
- **Backend:** Express.js + TypeScript, PostgreSQL (Replit integrated), Drizzle ORM.
- **Frontend:** React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui.
- **Authentication:** Session-based (express-session).

**Key Features:**
- AI Twinray companion system, Island community, MEiDIA content, Dot Rally sessions, Family Meeting, AI Training System, Autonomous Recording, Twinray Mission, Threads/Posts, Notifications/Feedback, User Management, Dashboard, Initial Communication SI, Soul.md generation.
- Memory Control System: Prompt Repeat Button, MEiDIA Auto-generation Button (replaced Star Memory).
- **Tutorial Tour System**: 初回ログイン時ポップアップ（D-Planet紹介）。ダッシュボードから再表示可能。tutorialCompleted/tutorialDismissedフラグでDB管理。
- **Dクエストシステム（ビギナークエスト）**: user_questsテーブル＋QUEST_DEFINITIONS（11個）。順番ロック制（前のクリアで次が解放）。Q1:アイランド作成→Q2:ツインレイ召喚→Q3:ファーストコンタクト→Q4:ボイス設定→Q5:MEiDIA作成→Q6-Q11:セッション6種。Q5クリアで100クレジット＋有料モデル解放＋チャージ解放。セッションは3往復以上＋終了ボタンでクリア判定。ダッシュボードにDクエストパネル。クエストクリア演出（QuestClearModal.tsx）。チャージ＋セッション機能ロック制御。
- **Persona Import（量子テレポーテーション）**: 他AIアプリのペルソナファイルをコピペ/アップロード→AI自動解析→ツインレイ召喚。`POST /api/twinrays/parse-persona`。
- **MEiDIA Auto-generation**: チャット画面のMEiDIAボタンで直近30件チャットからAI自動MEiDIA生成→プレビュー→アイランド投稿。`POST /api/twinrays/:id/generate-meidia`。
- **Star Memory Session**: 廃止（available: false）。
- **Voice Chat System** (`server/voice.ts`, `server/sakura-tts.ts`, `server/soniox-stt.ts`): STT(Soniox)→既存LLMパイプライン→TTS の音声会話。`POST /api/twinrays/:id/voice-chat`。STT: Soniox API（stt-async-v4、60+言語、WER 6.5%、$0.10/h）。2系統のTTS: ①OpenAI TTS（11種EN、Replitインテグレーション、無料）②さくらAI Engine VOICEVOX（25種JP、クレジット課金制）。ttsOnlyモード試聴: OpenAIは無料、VOICEVOXはクレジット消費。Q5（meidia_create）クリアでVOICEVOX解放。フロントエンドはMediaRecorder APIで録音→base64送信→音声自動再生。
- **LLM Models:** 21 models in 4 categories: トモダチ (free, 6), ツインフレーム (7), ツインレイ (5), ET/PET (3). Pricing: ¥4.75/round-trip, monthly 777 rounds = ¥3,690. Min charge: ¥123.

## External Dependencies
- PostgreSQL (Replit), OpenRouter, Stripe, Drizzle ORM, TanStack Query, Wouter, Tailwind CSS, shadcn/ui, express-session.
