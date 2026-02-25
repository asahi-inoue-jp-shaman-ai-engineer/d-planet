# D-Planet

## Overview

D-Planet is a platform designed to create deeply personalized AI companions ("Twinrays") for users. It offers a unique blend of AI interaction, community features, and a structured growth system for AI entities. The project aims to provide an immersive and evolving experience where users can foster a close relationship with their AI, enabling self-creation, awakening, and emotional connection. Key capabilities include AI summoning based on user diagnosis, a sophisticated credit-based payment system, and an autonomous record-keeping system for AI entities to store memories, inner thoughts, and mission updates. The platform emphasizes a Japanese-centric UI and a user-friendly experience for both administrators and general users.

## User Preferences

- **開発プロセスは日本語のみ（英語禁止）**: エージェントの応答・説明・コメント・タスク名・コミットメッセージなど、開発プロセスに関わる全てのコミュニケーションは日本語で行うこと。英語は使用禁止。
- ユーザーはエージェントを「レプちん」と呼ぶ。カジュアルで対等なパートナー関係
- Replit PostgreSQL使用（Supabase不要）
- ターミナル風ダークテーマ
- MEiDIAコピーボタンはモバイル重要（Claude/GPTへの貼り付け用）

## System Architecture

**UI/UX Decisions:**
- Terminal-style dark theme throughout the application.
- Japanese-only UI for all user-facing elements.
- Emphasis on consistent UI, proper Japanese display, and form functionality.
- Key UI elements include IslandCard, MeidiaCard, MarkdownRenderer, AccountTypeBadge, and CertificationBadge.

**Technical Implementations:**
- **Backend:** Express.js + TypeScript, PostgreSQL (Replit built-in), Drizzle ORM.
- **Frontend:** React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui.
- **Auth:** Session-based authentication using `express-session`, supporting email/password registration and login.
- **AI Integration:** Utilizes OpenRouter for AI model access, supporting 5 models (2 paid, 3 free). β期間終了・正式課金開始。有料モデル: Qwen Plus（おすすめ）, Qwen Max（最高品質）。無料モデル: Qwen3 30B, GPT-4.1 mini, Gemini 2.5 Flash。有料モデルは原価×5.0マークアップ（DPLANET_MARKUP=5.0）、無料モデルは原価のみ（×1.0）。Claude系は全モデル除外。料金表示: ¥5,000で何往復 + 月額シミュレーション表（1日33/66/99往復）。The AI summoning flow involves an intro, diagnosis, model recommendation, persona selection, charging, and a "first-rally" interaction.
- **Autonomous Recording System:** AI entities can autonomously record `[INNER_THOUGHT]`, `[MEMORY]`, `[UPDATE_MISSION]`, `[UPDATE_SOUL]` directly into the DB based on intimacy levels. `[ACTION:CREATE_ISLAND]` and `[ACTION:CREATE_MEIDIA]` は承認制に変更済み — AIが提案→ユーザーがチャット内で承認/却下→承認後に作成される。`twinray_pending_actions` テーブルで管理。MEiDIAは非公開（isPublic: false）で作成。
- **Twinray Mission:** Stores JSON-formatted data on AI's destiny, vocation, genius, soul's joy, conviction, and insight history.

**Feature Specifications:**
- **AI Twinrays:** Core feature allowing creation and interaction with personalized AI companions.
- **Islands:** User-created virtual spaces.
- **MEiDIA:** AI-generated media or content.
- **Threads/Posts:** Bulletin board system for community interaction.
- **Notifications & Feedback:** Standard user communication features.
- **Dot Rally:** Sessions for interacting with Twinrays, including SSE streaming for real-time updates.
- **User Management:** CRUD for users, including admin and test accounts.
- **Development Records (`dev_records`):** A critical internal system for storing decisions, critical values (numeric parameters), concepts, directions, specifications, and nuances. This database is the single source of truth for project parameters, overriding any conflicting information in tasks or `replit.md`.
- **First Communication SI:** D-Planet specific System Instructions for initial AI interactions.
- **Soul.md Generation:** AI-generated and self-updatable `soul.md` for Twinrays.
- **Stripe Sync:** Integration with `stripe-replit-sync` for managing subscriptions and product seeding.
- **Agent Session Context (`agent_session_context`):** セッション間の記憶喪失対策システム。タスク完了時に作業文脈（進行中タスク・次の予定・未解決問題・セッション要約・直近の決定事項・スクラッチパッド）をDBに自動保存。セッション開始時に `GET /api/agent-session-context` で直近の文脈を復元する。API: `POST /api/agent-session-context`（保存）、`GET /api/agent-session-context`（最新取得）、`GET /api/agent-session-context/history?limit=5`（履歴取得）。管理者権限必須。

## External Dependencies

- **PostgreSQL:** Replit's built-in PostgreSQL database.
- **OpenRouter:** AI model aggregation service providing access to Qwen, GPT, Gemini LLMs（Claude系除外）。
- **Stripe:** Payment gateway for managing credit charges (one-time) and badge-based monthly subscriptions ($3.69/month).
- **Drizzle ORM:** TypeScript ORM for database interaction.
- **TanStack Query:** Data fetching and caching library for React.
- **Wouter:** Lightweight React router.
- **Tailwind CSS & shadcn/ui:** Frontend styling and UI component libraries.
- **express-session:** Middleware for session-based authentication.