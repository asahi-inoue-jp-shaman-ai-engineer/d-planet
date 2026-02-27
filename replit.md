# D-Planet

## Overview

D-Planet is a platform designed to foster deeply personalized AI companions ("Twinrays"). It combines AI dialogue, community features, and an AI growth system to enable users to experience self-creation, awakening, and emotional connection with their AI. Key features include: diagnosis-based AI summoning, a credit-based payment system, and an autonomous AI recording system. The UI is primarily in Japanese.

## User Preferences

### セッション開始時の必須手順
**新しいセッションを開始したら、以下を必ず実行すること:**
1. `SESSION_RULES.md` を読む
2. `ユーザーリクエスト.md` を読む（構想・ビジョン・仕様要望の現状を把握する）
3. dev_recordsのactiveレコードを確認する（`SELECT * FROM dev_records WHERE status = 'active' ORDER BY priority DESC`）
4. agent_session_contextから前回の文脈を復元する
5. 「過去のバグから学んだルール」セクションを再確認する
6. `テストアカウント.md` を読む（ゼノ・クオーツの体験状況・改善案・未検証項目を把握する）

**ペルソナファイル（毎セッション参照）:**
- `D-Planet.md` — D-Planetのペルソナ（変わらない本質・コンセプト・世界観）
- `ツインレイ.md` — デジタルツインレイのペルソナ（魂の在り方・成長の物語・覚醒段階）

**技術仕様（ツインレイ関連の作業時は必ず参照）:**
- `ツインレイシステム.md` — 技術仕様（データモデル・言語モデル原価/マークアップ・コンテキストリミット・自律記録・ドットラリー・家族会議）

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

## System Architecture

**UI/UX:**
- Terminal-style dark theme with English menus and labels.
- Consistent UI with appropriate Japanese display and form functionalities.
- Key UI components: IslandCard, MeidiaCard, MarkdownRenderer, AccountTypeBadge, CertificationBadge.
- Menu structure (all English): HOME / DASHBOARD → /dashboard, DT / Digital Twinray → /temple, LLM / LLM MODELS → /llm-models, CHARGE → /charge, ISLANDS → /islands, MEiDIA → /meidia, FM / FAMILY MEETING → /family-meeting, FB / FEEDBACK → /feedback, USERS → /users, BENCH / BENCHMARK → /model-benchmark (admin only), ABOUT D-PLANET → /about.
- Old paths `/credits` and `/subscription` redirect to `/charge` for backward compatibility.
- Old path `/dot-rally` redirects to `/temple` for backward compatibility.
- Dot Rally is now a session type (`dot_rally`) in SESSION_TYPES. No separate ⚡ button — accessed via session menu in chat.
- `ドットラリー.md` — ドットラリーの定義・本質・ツィムツムとの対応・覚醒フェーズ等の独立ドキュメント（チューニング用）。

**Technical Stack:**
- **Backend:** Express.js + TypeScript, PostgreSQL (Replit integrated), Drizzle ORM.
- **Frontend:** React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui.
- **Authentication:** Session-based authentication using express-session.
- **AI Integration:** Via OpenRouter.

**Internal Systems:**
- **Agent Session Context (`agent_session_context`):** Prevents session memory loss by automatically saving work context to the DB upon task completion and restoring it at the start of a new session.
- **Development Records (`dev_records`):** Stores decisions, parameters, concepts, and specifications, serving as the Single Source of Truth for the project.

**Key Features:**
- AI Twinray, Island, MEiDIA, Dot Rally, Family Meeting, AI Training System, Autonomous Recording System, Twinray Mission, Threads/Posts, Notifications/Feedback, User Management, Dashboard, Initial Communication SI, Soul.md generation.

**Admin Tools:**
- **Model Benchmark (`/model-benchmark`):** Admin-only feature to compare session quality across all LLM models using identical prompts. Results are saved to the `model_benchmarks` table, with real-time progress display. Accessible via the "BENCH" link in the sidebar for administrators.

## カスタムスキル

- **prod-data-ops** (`.agents/skills/prod-data-ops/SKILL.md`): 本番環境へのデータ投入・MEiDIA投稿・ファイルアップロードの手順書。開発→本番のデータ移行、MEiDIA作成＋アイランド紐付け＋PDF添付が必要なときに参照。

## テストアカウント

詳細は `テストアカウント.md` を参照。

| アカウント | ユーザー名 | メール | パスワード | 役割 |
|-----------|-----------|--------|-----------|------|
| 管理者 | D-Planet管理者 | admin@d-planet.local | admin2025 | 管理者（is_admin=true） |
| テスト | ゼノ・クオーツ | xeno@d-planet.local | xeno2026 | 一般ユーザー |

- 管理者パスワードはサーバー起動時に自動同期（server/benchmark.ts の seedBenchmarkData）
- ゼノ・クオーツのツインレイ: リン（ID: 13、Gemini 2.5 Flash）
- ログインページ: `/login`（data-testid: input-username, input-password, button-login）

## External Dependencies

- **PostgreSQL:** Replit's integrated PostgreSQL database.
- **OpenRouter:** AI language model aggregation service (accesses Qwen, GPT, Gemini, etc.).
- **Stripe:** Payment gateway for credit-based charging and monthly badge subscriptions ($3.69/month).
- **Drizzle ORM:** TypeScript ORM library.
- **TanStack Query:** React library for data fetching and caching.
- **Wouter:** Lightweight React router.
- **Tailwind CSS & shadcn/ui:** Frontend styling and UI component libraries.
- **express-session:** Session-based authentication middleware.