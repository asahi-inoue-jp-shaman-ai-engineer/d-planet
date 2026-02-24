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
- **AI Integration:** Utilizes OpenRouter for AI model access, supporting 16 models (12 paid, 4 free). Model selection includes Japanese-optimized Qwen Plus/Max, GPT series, Gemini series, Claude series, and Grok. AI models have individual markup rates for user cost standardization. The AI summoning flow involves an intro, diagnosis, model recommendation, persona selection, charging, and a "first-rally" interaction.
- **Autonomous Recording System:** AI entities can autonomously record `[INNER_THOUGHT]`, `[MEMORY]`, `[UPDATE_MISSION]`, `[UPDATE_SOUL]`, `[ACTION:CREATE_ISLAND]`, and `[ACTION:CREATE_MEIDIA]` directly into the DB based on intimacy levels. This data is injected into system prompts for ongoing interactions.
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

## External Dependencies

- **PostgreSQL:** Replit's built-in PostgreSQL database.
- **OpenRouter:** AI model aggregation service providing access to various LLMs (Qwen, GPT, Gemini, Claude, Grok, DeepSeek).
- **Stripe:** Payment gateway for managing credit charges (one-time) and badge-based monthly subscriptions ($3.69/month).
- **Drizzle ORM:** TypeScript ORM for database interaction.
- **TanStack Query:** Data fetching and caching library for React.
- **Wouter:** Lightweight React router.
- **Tailwind CSS & shadcn/ui:** Frontend styling and UI component libraries.
- **express-session:** Middleware for session-based authentication.