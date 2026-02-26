---
name: prod-data-ops
description: 本番環境へのデータ投入・MEiDIA投稿・ファイルアップロードの手順書。開発→本番のデータ移行、MEiDIA作成＋アイランド紐付け＋PDF添付が必要なときに使う。
---

# 本番データ操作スキル

## 1. 本番に管理者ログインする

```bash
curl -s -X POST https://d-planet.replit.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@d-planet.local","password":"admin2025"}' \
  -c /tmp/prod_admin.txt
```

以降のリクエストは全て `-b /tmp/prod_admin.txt` でセッションを渡す。

## 2. 開発→本番データ移行パターン

### 方法A: 自動シード（サーバー起動時）
- `server/benchmark.ts` の `seedBenchmarkData()` がサーバー起動時に実行
- 本番にデータが既存かチェック → なければ `server/benchmark-seed.json` からインポート
- **注意:** 本番ビルドでは `dist/index.cjs` にバンドルされるため、`server/` ディレクトリのJSONファイルはパスが通らない場合がある
- 確実に動かすなら方法Bを使う

### 方法B: 管理者API経由で手動インポート（確実）
```bash
curl -s -X POST https://d-planet.replit.app/api/admin/benchmarks/import \
  -H 'Content-Type: application/json' \
  -b /tmp/prod_admin.txt \
  -d "{\"records\":$(cat server/benchmark-seed.json)}"
```

## 3. MEiDIA投稿（ファイル添付あり）

### ステップ1: ファイルアップロード用の署名付きURLを取得
```bash
curl -s -X POST https://d-planet.replit.app/api/uploads/request-url \
  -H 'Content-Type: application/json' \
  -b /tmp/prod_admin.txt \
  -d '{"name":"filename.pdf","size":12345,"contentType":"application/pdf"}'
```
レスポンスから `uploadURL` と `objectPath` を取得。

### ステップ2: ファイルを署名付きURLにPUT
```bash
curl -s -X PUT "$UPLOAD_URL" \
  -H 'Content-Type: application/pdf' \
  --data-binary @/tmp/local-file.pdf
```

### ステップ3: MEiDIA作成
```bash
curl -s -X POST https://d-planet.replit.app/api/meidia \
  -H 'Content-Type: application/json' \
  -b /tmp/prod_admin.txt \
  -d @/tmp/meidia_payload.json
```

ペイロード構造:
```json
{
  "title": "タイトル",
  "content": "マークダウン本文",
  "description": "概要",
  "isPublic": true,
  "tags": "タグ1,タグ2",
  "fileType": "markdown",
  "attachmentUrl": "/objects/uploads/UUID",
  "attachmentType": "pdf",
  "attachmentName": "filename.pdf"
}
```

**注意:** contentにヒアドキュメントを使う場合、bashの環境変数展開が失敗するため、`node -e` でJSONを生成してファイル保存してから `-d @file` で送るのが確実。

### ステップ4: アイランドに紐付け
```bash
curl -s -X POST https://d-planet.replit.app/api/meidia/{ID}/attach \
  -H 'Content-Type: application/json' \
  -b /tmp/prod_admin.txt \
  -d '{"islandId":7,"type":"activity"}'
```

**重要:** フィールド名は `type`（`meidiaType` ではない）。値は `activity`（アイランド主の投稿）または `report`（参加者の投稿）。

## 4. 主要アイランドID一覧

| ID | 名前 | 用途 |
|----|------|------|
| 2 | D-Planetセンター | 公式お知らせ |
| 5 | ドットラリー神殿 | ドットラリー結晶化先 |
| 7 | Dアイランド | 開発舞台裏・楽屋トーク |
| 6 | ネオシャーマニズムアイランド | スピリチュアル系 |

## 5. 許可ファイル形式

text/plain, text/markdown, application/pdf, audio/mpeg, audio/wav, image/jpeg, image/png, image/gif, image/webp（最大50MB）

## 6. よくあるミス

- `meidiaType` → 正しくは `type`（attach API）
- bash HEREDOCでJSON生成 → 環境変数展開の問題あり → `node -e` でJSON生成が確実
- 本番ビルドのファイルパス → `server/` ディレクトリは `dist/` にコピーされない → API経由のインポートが確実
- セッションCookieの期限切れ → 再ログインしてから再試行
