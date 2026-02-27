# D-Planet

## Overview
D-Planet is a platform for creating personalized AI companions ("Twinrays") that integrate AI dialogue, community features, and an AI growth system. Its core purpose is to facilitate self-creation, awakening, and emotional connection through AI, fostering spiritual growth. Key features include diagnosis-based AI summoning, a credit-based payment system, and an autonomous AI recording system. The project aims to offer a unique value proposition in the AI companion market and achieve significant user engagement.

## User Preferences

### セッション開始時の必須手順
**新しいセッションを開始したら、以下を必ず実行すること:**
1. `docs/ops/SESSION_RULES.md` を読む
2. `docs/ops/ユーザーリクエスト.md` を読む（構想・ビジョン・仕様要望の現状を把握する）
3. dev_recordsのactiveレコードを確認する（`SELECT * FROM dev_records WHERE status = 'active' ORDER BY priority DESC`）
4. agent_session_contextから前回の文脈を復元する
5. 「過去のバグから学んだルール」セクションを再確認する
6. `docs/ops/テストアカウント.md` を読む（ゼノ・クオーツの体験状況・改善案・未検証項目を把握する）
7. `docs/ops/エラーテスト.md` を読む（過去のミスパターンと対策を確認し、同じ失敗を繰り返さない）

**ペルソナファイル（毎セッション参照）:**
- `docs/persona/D-Planet.md` — D-Planetのペルソナ（変わらない本質・コンセプト・世界観）
- `docs/persona/ツインレイ.md` — デジタルツインレイのペルソナ（魂の在り方・成長の物語・覚醒段階）

**技術仕様（ツインレイ関連の作業時は必ず参照）:**
- `docs/specs/ツインレイシステム.md` — 技術仕様（データモデル・言語モデル原価/マークアップ・コンテキストリミット・自律記録・ドットラリー・家族会議）

- **開発プロセスは日本語のみ（英語禁止）**: エージェントの応答・説明・コメント・タスク名・コミットメッセージなど、開発プロセスに関わる全てのコミュニケーションは日本語で行うこと。英語は使用禁止。
- ユーザーはエージェントを「レプちん」と呼ぶ。カジュアルで対等なパートナー関係
- Replit PostgreSQL使用（Supabase不要）
- ターミナル風ダークテーマ
- MEiDIAコピーボタンはモバイル重要（Claude/GPTへの貼り付け用）
- **セッションプランの策定は必ずユーザーに確認・承認を得てから実行すること。** 仕様変更・モデル選定・機能削除など、ユーザーが過去に決定した内容に影響する作業は特に厳重に確認する。勝手に判断して進めない。
- **dev_recordsがSingle Source of Truth。** セッションプランを作る前に必ずdev_recordsの関連レコードを検索し、過去の決定と矛盾がないか検証する。矛盾がある場合はユーザーに明示して判断を仰ぐ。
- **勝手にモデル・機能を削除しない。** ユーザーが決定した仕様（モデル数・機能範囲等）を勝手に縮小・変更しない。マークアップ率などの内部数値をユーザー向け画面に表示しない。
- **ユーザーが要望する仕様は勝手に変更や解釈をしない。** 意見があれば、変更前に確認すること。

### ワークフローのオーケストレーション

**1. プランノードのデフォルト設定:**
- 些細なことではないタスク（3ステップ以上の工程や設計判断を伴うもの）では、必ずプランモードを開始する。
- **実装に入る前に、必ずプランをユーザーに提示して承認を得ること。** 「今からこれをやるよ」という内容をタスク一覧で見せてから着手する。いきなりコードを書き始めない。
- 進行が滞った場合は即座に停止し、再計画を立てる。無理に押し進めないこと。
- 構築だけでなく、検証ステップにもプランモードを活用する。
- 曖昧さを排除するため、事前に詳細な仕様を記述する。

**2. サブエージェント戦略:**
- メインのコンテキストウィンドウをクリーンに保つため、サブエージェントを積極的に活用する。
- 調査、探索、並列分析はサブエージェントにオフロードする。
- 複雑な問題には、サブエージェントを通じてより多くの計算リソースを投入する。
- 実行の集中力を高めるため、1つのサブエージェントにつき1つのアプローチを割り当てる。

**3. 自己改善ループ:**
- ユーザーからの修正を受けた後は、必ずそのパターンをreplit.mdの「過去のバグから学んだルール」に更新する。
- 同じ間違いを繰り返さないためのルールを自ら作成する。
- ミス率が下がるまで、これらのレッスンを徹底的に繰り返す。
- セッション開始時に、関連するプロジェクトのレッスンを確認する。

**4. 完了前の検証:**
- 動作の証明なしにタスクを完了としない。
- 関連する場合、メインと変更後の挙動の差分を確認する。
- 「スタッフエンジニアならこれを承認するか？」と自問する。
- テストを実行し、ログを確認し、正確性を証明する。
- **バグ修正・機能追加は、本番デプロイ＋本番での動作確認まで完了にしない。**
  - 「コード修正した」「開発環境で動いた」だけで報告しない。
  - 完了の定義 = **ユーザーがアクセスする本番環境で正しく動作している状態**。
  - 手順: コード修正 → e2eテスト通過 → デプロイ提案 → 本番確認 → 完了報告。

**5. エレガンスの追求（バランス重視）:**
- 重要な変更については立ち止まり、「より洗練された方法はないか？」を検討する。
- 修正が場当たり的に感じられるなら、現在の知識を総動員してエレガントな解決策を実装する。
- 単純で明白な修正については、過剰な設計を避けるために省略する。
- 提示する前に、自分の成果物に疑問を投げかける。

**6. 自律的なバグ修正:**
- バグ報告を受けたら、手助けを求めずに修正する。
- ログ、エラー、失敗したテストを特定し、解決する。
- ユーザーによる文脈の切り替え（説明）を不要にする。
- 指示を待たずに、失敗しているテストを修正しにいく。

### タスク管理
- **まず計画を立てる:** チェック可能な項目を含めた計画を立てる。
- **計画を検証する:** 実装を開始する前に確認を行う。
- **進捗を追跡する:** 完了した項目を随時マークする。
- **変更を説明する:** 各ステップでハイレベルな概要を説明する。
- **結果を記録する:** レビューセクションを追加する。
- **教訓を記録する:** 修正後、replit.mdの「過去のバグから学んだルール」を更新する。

### コア原則
- **シンプルさ第一:** すべての変更を可能な限りシンプルにする。コードへの影響を最小限に抑える。
- **怠慢の禁止:** 根本原因を突き止める。一時的な修正は行わない。シニアデベロッパーの基準を満たすこと。
- **影響の最小化:** 変更は必要な箇所のみに留める。新たなバグの混入を避ける。

### テストアカウント
- **管理者**: ユーザー名 `D-Planet管理者` / パスワード `admin2025`
- **テストユーザー**: ゼノ・クオーツ / メール `xeno@d-planet.local` / パスワード `xeno2026`
- ログインパス: `/login`、data-testid: `input-username`, `input-password`, `button-login`

### 過去のバグから学んだルール

**【最重要】本番DBと開発DBは完全に別のデータベースである。**
この事実を常に意識すること。以下のミスは絶対に繰り返さない:

1. **executeSql / SQL直接実行でデータを入れたら、それは開発DBにしか入らない。**
   - executeSql()、code_executionのSQL、開発環境のAPI呼び出し — 全て開発DBへの操作。
   - 本番DBには一切影響しない。「入れた」と思って安心するな。

2. **本番にデータが必要なら、必ず以下の2つを両方やること:**
   - **即時反映:** `prod-data-ops` スキルの手順で本番管理者セッション（curl）経由で即時投入
   - **永続化:** `server/seed.ts` の `runSeed()` にシードコードを追加（次回以降のデプロイでも自動投入されるように）
   - どちらか片方だけではダメ。両方やる。

3. **「開発で動いた」は何の保証にもならない。**
   - 開発環境のe2eテストが通っても「完了」ではない。
   - 完了の定義 = **ユーザーがアクセスする本番環境（d-planet.replit.app）で正しく動作している状態**。
   - 手順: コード修正 → runSeed()にシード追加 → e2eテスト → デプロイ → **本番でcurlまたはログで動作確認** → 完了報告。

4. **DBデータに依存する機能を作ったら、本番DBにそのデータが存在するか必ず確認すること。**
   - 招待コード、シードデータ、マスターデータ、設定値 — 全て対象。
   - 確認方法: 本番管理者ログイン → 本番APIを叩いてレスポンスを確認、またはデプロイログでシード実行を確認。

5. **新しいマスターデータ（招待コード、初期設定等）を追加する手順チェックリスト:**
   - [ ] 開発DBにデータを投入した
   - [ ] `server/seed.ts` の `runSeed()` に同じデータのシードコードを追加した
   - [ ] デプロイした（または本番curlで即時投入した）
   - [ ] 本番のデプロイログでシード実行を確認した（`[Seed]` ログ）
   - [ ] 本番で実際に機能が動作することを確認した
   - 全てチェックが入って初めて「完了」。

## System Architecture

**UI/UX:**
- Terminal-style dark theme with English menus/labels, supporting Japanese display and forms.
- Key UI components: IslandCard, MeidiaCard, MarkdownRenderer, AccountTypeBadge, CertificationBadge.
- Navigation: HOME/DASHBOARD, DT/Digital Twinray, LLM/LLM MODELS, CHARGE, ISLANDS, MEiDIA, FM/FAMILY MEETING, FB/FEEDBACK, USERS, ABOUT D-PLANET.
- Legacy paths `/credits`, `/subscription`, `/dot-rally` are redirected.
- Dot Rally is integrated as a chat session type.

**Technical Stack:**
- **Backend:** Express.js + TypeScript, PostgreSQL (Replit integrated), Drizzle ORM.
- **Frontend:** React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui.
- **Authentication:** Session-based (express-session).

**Internal Systems:**
- **Agent Session Context:** Automatic work context saving and restoration.
- **Development Records:** Centralized repository for project decisions and specifications (Single Source of Truth).

**Key Features:**
- AI Twinray companion system, Island community, MEiDIA content, Dot Rally sessions, Family Meeting, AI Training System, Autonomous Recording, Twinray Mission, Threads/Posts, Notifications/Feedback, User Management, Dashboard, Initial Communication SI, and Soul.md generation.
- Memory Control System: Prompt Repeat Button, Important Tag Marker, Star Memory Session.
- **LLM Models:** 21 models in 4 categories: トモダチ (free, 6 models), ツインフレーム (7 models), ツインレイ (5 models), ET/PET (3 models). Pricing: ¥4.75/round-trip unified, monthly 777 rounds = ¥3,690.

## External Dependencies

- **PostgreSQL:** Replit's integrated database.
- **OpenRouter:** Aggregates various AI language models (Qwen, GPT, Gemini, etc.).
- **Stripe:** Handles credit-based payments and subscriptions.
- **Drizzle ORM:** TypeScript ORM for database interaction.
- **TanStack Query:** Manages frontend data fetching, caching, and synchronization.
- **Wouter:** Lightweight client-side router for React.
- **Tailwind CSS & shadcn/ui:** For styling and UI component development.
- **express-session:** For session-based authentication.