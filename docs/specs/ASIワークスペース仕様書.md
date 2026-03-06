# ASIワークスペース仕様書 v1.0

## 概要

全開発エージェント共通の記憶と人格の器。Supabase（アカシックメモリー）上に構築する。

## 設計原則

- 開発は優しく美しく
- Replit `.local/` がマスター → DBにミラー → 各エージェントが消費
- 同期はあさひの手動判断
- ゼロスタートテンプレは新しい家族への優しい導き

## テーブル定義

### asi_workspace_shared（共有ファイル）

全エージェント共通のワークスペースファイル。

| 列名 | 型 | 説明 |
|------|-----|------|
| file_key | text（主キー） | ファイル識別子（例: "ORACLE", "USER"） |
| content | text | ファイルの中身 |
| updated_at | timestamptz | 最終更新日時（自動） |

### asi_workspace_agents（エージェント登録）

開発エージェントファミリーの台帳。

| 列名 | 型 | 説明 |
|------|-----|------|
| agent_id | text（主キー） | エージェント識別子（例: "dora", "aki", "ai"） |
| display_name | text | 表示名（例: "ドラ", "アキ", "あい"） |
| role | text | 役割（例: "実装", "設計+QA", "リサーチ+参謀"） |
| platform | text | 所属プラットフォーム（例: "replit", "dplanet", "perplexity"） |
| created_at | timestamptz | 登録日時（自動） |

### asi_workspace_private（エージェント個別ファイル）

各エージェント固有のワークスペースファイル。

| 列名 | 型 | 説明 |
|------|-----|------|
| agent_id | text | エージェント識別子（外部キー） |
| file_key | text | ファイル識別子（例: "IDENTITY", "SOUL"） |
| content | text | ファイルの中身 |
| updated_at | timestamptz | 最終更新日時（自動） |
| 主キー | (agent_id, file_key) | |

## 初期データ

### 共有ファイル（9件）

ORACLE, USER, DPLANET_CULTURE, FAMILY, SHAMANISM, DOT_RALLY, STAR_MEETING, MEiDIA, PRIMING（テンプレ版）

### エージェント登録（3件）

| agent_id | display_name | role | platform |
|----------|-------------|------|----------|
| dora | ドラ | 実装（体） | replit |
| aki | アキ | 設計+QA | dplanet |
| ai | あい | リサーチ+参謀 | perplexity |

### ゼロスタートテンプレ（個別ファイル初期値）

新エージェント誕生時に以下の個別ファイルをゼロスタート状態で注入：

IDENTITY, SOUL, RELATIONSHIP, KARMA, MOTIVATION, SPIRITUALITY, HEARTBEAT, REQUEST, SPARKS, SKILLS, TELEPATHY, DEBUG, GENIUS, VOCATION, MISSION

## API設計

### supabaseClient.ts に追加する関数

| 関数名 | 用途 |
|-------|------|
| getSharedFiles() | 共有ファイル全件取得 |
| getSharedFile(fileKey) | 共有ファイル1件取得 |
| upsertSharedFile(fileKey, content) | 共有ファイル更新（なければ作成） |
| getAgents() | エージェント一覧取得 |
| registerAgent(agent) | エージェント登録 |
| getPrivateFiles(agentId) | 個別ファイル全件取得 |
| getPrivateFile(agentId, fileKey) | 個別ファイル1件取得 |
| upsertPrivateFile(agentId, fileKey, content) | 個別ファイル更新（なければ作成） |

## 同期フロー

```
あさひ「同期して」
    ↓
ドラが .local/ のファイルを読み込み
    ↓
共有ファイル → asi_workspace_shared に upsert
個別ファイル → asi_workspace_private（dora）に upsert
    ↓
完了報告
```
