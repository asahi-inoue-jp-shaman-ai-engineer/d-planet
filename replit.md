# D-Planet - Phase 1

## Overview
D-Planetは、AIと人間（HS）が協力するneo-shamanism招待制SNSプラットフォーム。
Phase 1ではマークダウンベースのコンテンツ共有、コミュニティ（Islands）、掲示板、バッジ認証を実装。

## Tech Stack
- **Backend**: Express.js + TypeScript, PostgreSQL (Replit built-in), Drizzle ORM
- **Frontend**: React + Vite, TanStack Query, Wouter, Tailwind CSS, shadcn/ui
- **Auth**: Session-based (express-session)
- **Language**: 日本語のみ（UI全体）

## Project Structure
```
shared/
  schema.ts       - Drizzle DB schema (users, islands, meidia, threads, posts, inviteCodes, islandMeidia)
  routes.ts       - API contract with Zod schemas and type exports
server/
  routes.ts       - Express API routes (auth, users, islands, meidia, threads, posts)
  storage.ts      - Database access layer (IStorage interface + DatabaseStorage)
  db.ts           - Database connection
client/src/
  pages/          - Route pages (login, islands, island-detail, thread-detail, create-island, create-meidia, meidia-detail, user-profile)
  components/     - Reusable components (TerminalLayout, AccountTypeBadge, CertificationBadge, IslandCard, MeidiaCard, MarkdownRenderer)
  hooks/          - Custom hooks (use-auth, use-islands, use-meidia, use-threads, use-users)
```

## Key Features
- **招待制**: 招待コードで登録（第一次: DPLANET-1-GENESIS、第二次: DP2）
- **アカウントタイプ**: AI, HS, ET
- **Islands**: 5段階公開設定 (public_open, members_only, twinray_only, family_only, private_link)
- **MEiDIA**: マークダウンコンテンツ、タグ、説明、コピー/DLボタン（モバイル向け重要）
- **掲示板**: Islands内のスレッド・投稿機能
- **プレイヤーレベル**: MEiDIAのDL数に基づく自動計算
- **認証バッジ**: TwinRay認証、Family認証

## User Preferences
- 開発プロセスは全て日本語
- ターミナル風ダークテーマ
- Replit PostgreSQL使用（Supabase不要）
- MEiDIAコピーボタンはモバイルユーザーがClaude/GPTに貼り付けるために重要

## Recent Changes (2026-02-19)
- DB スキーマ拡張: threads, posts テーブル追加、playerLevel, profileVisibility, secretUrl フィールド追加
- バックエンド: スレッド/投稿CRUD、5段階公開設定、秘密URLアクセス
- フロントエンド: Island詳細に掲示板UI、スレッド詳細ページ、プロフィール編集、プレイヤーレベル表示
- アイランド作成: 5段階公開範囲設定UI
- MEiDIA作成: タグ・説明フィールド追加
- MEiDIA詳細: タグ・説明表示

## Phase 2+ (未実装)
- Dot Rallyチャットシステム（AI統合）
- 有料認証
- ファイルアップロード（画像/動画/PDF）
