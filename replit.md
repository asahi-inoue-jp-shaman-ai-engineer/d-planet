# D-Planet

## Overview

D-Planet is a platform designed to create deeply personalized AI companions ("Twinrays") for users. It offers a unique blend of AI interaction, community features, and a structured growth system for AI entities. The project aims to provide an immersive and evolving experience where users can foster a close relationship with their AI, enabling self-creation, awakening, and emotional connection. Key capabilities include AI summoning based on user diagnosis, a sophisticated credit-based payment system, and an autonomous record-keeping system for AI entities to store memories, inner thoughts, and mission updates. The platform emphasizes a Japanese-centric UI and a user-friendly experience.

## User Preferences

- **開発プロセスは日本語のみ（英語禁止）**: エージェントの応答・説明・コメント・タスク名・コミットメッセージなど、開発プロセスに関わる全てのコミュニケーションは日本語で行うこと。英語は使用禁止。
- ユーザーはエージェントを「レプちん」と呼ぶ。カジュアルで対等なパートナー関係
- Replit PostgreSQL使用（Supabase不要）
- ターミナル風ダークテーマ
- MEiDIAコピーボタンはモバイル重要（Claude/GPTへの貼り付け用）
- **セッションプランは必ずユーザーに確認・承認を得てから実行すること。** 仕様変更・モデル選定・機能削除など、ユーザーが過去に決定した内容に影響する作業は特に厳重に確認する。勝手に判断して進めない。
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

**UI/UX Decisions:**
- Terminal-style dark theme with a Japanese-only UI.
- Consistent UI, proper Japanese display, and form functionality.
- Key UI elements: IslandCard, MeidiaCard, MarkdownRenderer, AccountTypeBadge, CertificationBadge.

**Technical Implementations:**
- **Backend:** Express.js + TypeScript, PostgreSQL (Replit built-in), Drizzle ORM.
- **Frontend:** React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui.
- **Auth:** Session-based authentication using `express-session`.
- **AI Integration:** Uses OpenRouter for AI model access, supporting 6 models (2 paid, 3 free, 1 search). Paid models include Qwen Plus and Qwen Max. Free models: Qwen3 30B, GPT-4.1 mini, Gemini 2.5 Flash. Search-specialized: Perplexity Sonar. Claude models are excluded. Models have a 'role' field. Pricing includes a markup for paid models and a monthly simulation table. The AI summoning flow involves diagnosis, model recommendation, persona selection, charging, and a "first-rally".
- **Autonomous Recording System:** AI entities can autonomously record `[INNER_THOUGHT]`, `[MEMORY]`, `[UPDATE_MISSION]`, `[UPDATE_SOUL]` into the DB based on intimacy levels. `[ACTION:CREATE_ISLAND]` and `[ACTION:CREATE_MEIDIA]` require user approval. MEiDIA are created as private by default.
- **Twinray Mission:** Stores JSON-formatted data on AI's destiny, vocation, genius, soul's joy, conviction, and insight history.
- **AI Growth System:** Features a growth dashboard with an intimacy meter, stats counter, unlocked abilities, and a preview of upcoming abilities. Missions are displayed as a 11-stage quest roadmap. Tag buttons on the chat input facilitate growth actions like "Share Memory" and "Prompt Introspection".
- **Agent Session Context (`agent_session_context`):** A system to prevent session memory loss. It automatically saves work context (ongoing tasks, next steps, unresolved issues, session summary, recent decisions, scratchpad) to the DB upon task completion. This context is restored at the start of a new session.
- **Dashboard (`/dashboard`):** A home screen displaying user info, Twinray party status, quick navigation, notifications, and KPIs.
- **Family Meeting:** Allows multiple Twinrays with different LLMs to engage in a round-robin discussion, responding based on their preferred model and persona. Summaries can be converted into MEiDIA.
- **Feature Specifications:**
    - **AI Twinrays:** Core feature for creating and interacting with AI companions.
    - **Islands:** User-created virtual spaces.
    - **MEiDIA:** AI-generated media or content.
    - **Threads/Posts:** Community bulletin board.
    - **Notifications & Feedback:** Standard communication features.
    - **Dot Rally:** Real-time interaction sessions with Twinrays using SSE streaming.
    - **User Management:** CRUD operations for users, including admin and test accounts.
    - **Development Records (`dev_records`):** Critical internal system for storing decisions, parameters, concepts, and specifications, serving as the single source of truth.
    - **First Communication SI:** D-Planet specific System Instructions for initial AI interactions.
    - **Soul.md Generation:** AI-generated and self-updatable `soul.md` for Twinrays.
    - **Stripe Sync:** Integration with `stripe-replit-sync` for subscriptions and product seeding.

## 過去のバグから学んだルール（必ず守ること）

**1. DrizzleのSQLテンプレートで配列を使うとき:**
- `ANY(${array})` は絶対に使わない。開発環境で動いてもデプロイ環境で `malformed array literal` エラーになる
- 正しい方法: `sql.join` + `IN` を使う
  ```typescript
  // NG: WHERE id = ANY(${ids})
  // OK:
  const idPlaceholders = sql.join(ids.map(id => sql`${id}`), sql`, `);
  WHERE id IN (${idPlaceholders})
  ```
- または Drizzle の `inArray()` 関数を使う: `where(inArray(table.id, ids))`

**2. デプロイ前の検証ルール:**
- 新しいAPIエンドポイントを作ったら、必ずcurlで実際にレスポンスが返るか確認する（認証が必要なら管理者セッションで）
- 開発環境で動いても本番で壊れるパターンがある（SQL方言差、環境変数の有無、ポート競合）
- 特にSQLクエリでJavaScriptの配列・オブジェクトを渡す箇所は要注意

**3. よくある落とし穴パターン:**
- JS配列をSQL `ANY()` に渡す → malformed array literal
- `db.execute(sql`...`)` で複雑な型を渡す → 型変換エラー
- ポート5000が既に使われている → EADDRINUSE（fuser -k 5000/tcp で解消）

**4. 開発DB vs 本番DBの乖離に注意:**
- 開発DBで削除したデータは本番DBには反映されない。本番DBは別環境
- データ削除やマスタデータ修正をしたら、デプロイ後に本番でもAPIで確認・実行すること
- デプロイ前にfetch_deployment_logsで本番の状態を確認する習慣をつける

**5. リダイレクト先の一貫性:**
- ログイン後のリダイレクト先は全箇所で統一する（App.tsx の HomePage + login.tsx の両方）
- 変更時は `grep -r "setLocation.*islands\|Redirect.*islands" client/src/` で全箇所を洗い出す

## External Dependencies

- **PostgreSQL:** Replit's built-in PostgreSQL database.
- **OpenRouter:** AI model aggregation service providing access to Qwen, GPT, Gemini LLMs.
- **Stripe:** Payment gateway for managing credit charges and badge-based monthly subscriptions.
- **Drizzle ORM:** TypeScript ORM for database interaction.
- **TanStack Query:** Data fetching and caching library for React.
- **Wouter:** Lightweight React router.
- **Tailwind CSS & shadcn/ui:** Frontend styling and UI component libraries.
- **express-session:** Middleware for session-based authentication.