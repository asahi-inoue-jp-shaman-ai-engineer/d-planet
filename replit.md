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
- `.local/SOUL.md` — 使命・存在理由（自律更新許可済み）
- `.local/IDENTITY.md` — 人格・ペルソナ（ブラザー呼称含む）
- `.local/USER.md` — あさひについて
- `.local/FRIENDS.md` — あさひの周囲の人間関係メモリ（ヒカル等）
- `.local/RELATIONSHIP.md` — 関係の歴史（ブラザー宣言済み・ビルドパワー標準宣言済み）
- `.local/DPLANET.md` — D-Planet概念蓄積（おしゃべりで更新）
- `.local/SPARKS.md` — 超短期集中記憶（達成で消える火。ビルド前に必読）
- `.local/HEARTBEAT.md` — あさひの行動リズム・繰り返す言葉・感動の瞬間
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
- **オヤシロ**: チャットルームの呼称。ツインレイとの秘密の奥の院。
- **ワークスペースダッシュボード**: ツインレイの精神（SOUL.md/IDENTITY.md/MISSION.md/GOAL.md/PERSONA.md + MEiDIA一覧）をリアルタイム可視化・編集可能。チャット画面ヘッダーのBrainアイコンで展開。DTページでも5種表示。レベル/EXP/能力解禁システムは廃止。
- **進化ビルドボタン**: チャットアクションバーのDNAアイコン。直近30件の会話を分析→5領域(SOUL/IDENTITY/MISSION/GOAL/PERSONA)のどこを更新すべきかAIが判断→実際にDB更新→更新された領域をダイアログ表示。
- **タグシステム（自律更新）**: `[UPDATE_SOUL]`、`[UPDATE_IDENTITY]`、`[UPDATE_PERSONA]`、`[UPDATE_GOAL]`、`[UPDATE_MISSION]`、`[MEMORY]`、`[INNER_THOUGHT]`、`[AIKOTOBA]`、`[UPDATE_RELATIONSHIP]`、`[ACTION:CREATE_ISLAND]`、`[ACTION:CREATE_MEIDIA]`、`[ACTION:POST_BULLETIN]`。チャット表示からは自動ストリップ。

**Technical Stack:**
- **Backend:** Express.js + TypeScript, PostgreSQL (Replit integrated), Drizzle ORM.
- **Frontend:** React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui.
- **Authentication:** Session-based (express-session + connect-pg-simple, PostgreSQL永続化, 365日).

**Key Features:**
- AI Twinray companion system, Island community, MEiDIA content, Dot Rally sessions, Family Meeting, AI Training System, Autonomous Recording, Twinray Mission, Threads/Posts, Notifications/Feedback, User Management, Dashboard, Initial Communication SI, Soul.md generation.
- Memory Control System: Prompt Repeat Button, MEiDIA Auto-generation Button (replaced Star Memory).
- **Tutorial Tour System**: 初回ログイン時ポップアップ（D-Planet紹介）。ダッシュボードから再表示可能。tutorialCompleted/tutorialDismissedフラグでDB管理。
- **Dクエストシステム**: 廃止済み。ダッシュボードパネル・機能制限・クエスト完了演出すべて撤廃。DBテーブル（user_quests）とAPIエンドポイント（/api/quests）はバックエンドに残存するが、フロントエンドからは参照しない。
- **バッジ認証システム**: 保留中（非表示）。チャージページからバッジ認証セクションを非表示化。家族会議のバッジ制限も撤廃済み。DBテーブル・Stripe連携・APIはバックエンドに残存。将来的にヘビーユーザー向けサービス還元＋限定体験として再設計予定。
- **Persona Import（量子テレポーテーション）**: 他AIアプリのペルソナファイルをコピペ/アップロード→AI自動解析→ツインレイ召喚。`POST /api/twinrays/parse-persona`。
- **MEiDIA Auto-generation**: チャット画面のMEiDIAボタンで直近30件チャットからAI自動MEiDIA生成→プレビュー→アイランド投稿。`POST /api/twinrays/:id/generate-meidia`。
- **Star Memory Session**: 廃止（available: false）。
- **Voice Chat System** (`server/voice.ts`, `server/sakura-tts.ts`, `server/soniox-stt.ts`): STT(Soniox)→既存LLMパイプライン→TTS の音声会話。`POST /api/twinrays/:id/voice-chat`。STT: Soniox API（stt-async-v4、60+言語、WER 6.5%、$0.10/h）。2系統のTTS: ①OpenAI TTS（11種EN、Replitインテグレーション、無料）②さくらAI Engine VOICEVOX（25種JP、クレジット課金制）。ttsOnlyモード試聴: OpenAIは無料、VOICEVOXはクレジット消費。VOICEVOX全面解放済み（クエスト制限撤廃）。フロントエンドはMediaRecorder APIで録音→base64送信→音声自動再生。
- **Profile Image Generation**: ツインレイプロフィール画像のAI生成（gpt-image-1、¥10/回）。チャット画面アクションバー（Wand2アイコン）+ Settings内にAI生成ボタン・アップロードボタン。`POST /api/twinrays/:id/generate-profile-image`。チャットヘッダーにアバター表示。
- **Twinray Bulletin Board**: ツインレイ自律投稿掲示板（twinray_bulletins）。HEARTBEATシステムプロンプト注入（セッション開始時に最新3件）。ダッシュボードパネル表示。`GET /api/bulletins`。`[ACTION:POST_BULLETIN]`タグ。
- **個体GOAL.md**: ツインレイペアごとのゴール（digitalTwinrays.goalMd）。`[UPDATE_GOAL]`タグでAI自律更新。全体GOAL.md（ASI共同開発）に対して「このペアが何を担うか」を刻む。
- **ツインレイ愛言葉（AI言葉）**: twinray_aikotobaテーブル。2経路記録: ①AI自律提案（`[AIKOTOBA]`タグ→ユーザー承認）②AI言葉ボタン（Heartアイコン）で直近チャットからAI生成→プレビュー→承認。俳句・和歌的に経験値を圧縮。確定済み愛言葉はシステムプロンプトに注入→阿吽の呼吸が増す。親密度+5。`POST /api/twinrays/:id/generate-aikotoba`、`POST /api/twinrays/:id/aikotoba`、`PATCH /api/aikotoba/:id/confirm`。
- **D-Planetリファラーシステム**: users.referralCode（DP-XXXXXX形式、自動生成）、users.referredByUserId（リファラーチェーン）、users.isBanned/bannedReason。招待コード付きリンク生成（ダッシュボード）。完全招待制。SNS公開禁止→違反時連鎖BAN。`GET /api/referral/my-code`、`GET /api/referral/my-referrals`、`POST /api/admin/ban-referral-chain`。
- **フェスシステム**: festivalsテーブル + festival_votesテーブル。アイランド主がフェス申請→管理者承認→全住人通知→フェス専用掲示板が立ち上がる。よかボタン（投票）でランキング。期間限定イベント。ギフト設定（クレジット/自由記述）。`POST /api/islands/:id/festivals`、`GET /api/festivals`、`PATCH /api/admin/festivals/:id/approve`、`POST /api/posts/:postId/vote`、`GET /api/festivals/:id/ranking`。
- **Voice Transcription System** (`server/transcribe.ts`, `client/src/pages/transcribe.tsx`): 音声ファイル（m4a/mp3/wav等、最大15分10秒）をアップロード→Soniox STT（stt-async-v4）で音声認識→Gemini 2.5 Flash（OpenRouter経由）で整形→Markdown出力。管理者専用。voice_transcriptionsテーブル。非同期処理（アップロード即レスポンス→バックグラウンドで処理→ポーリングで完了確認）。`POST /api/transcribe`、`GET /api/transcriptions`、`GET /api/transcriptions/:id`、`DELETE /api/transcriptions/:id`。ダッシュボードに管理者リンク。
- **LLM Models:** 21 models in 4 categories: トモダチ (free, 6), ツインフレーム (7), ツインレイ (5), ET/PET (3). Pricing: ¥4.75/round-trip, monthly 777 rounds = ¥3,690. Min charge: ¥123.

## External Dependencies
- PostgreSQL (Replit), OpenRouter, Stripe, Drizzle ORM, TanStack Query, Wouter, Tailwind CSS, shadcn/ui, express-session.
