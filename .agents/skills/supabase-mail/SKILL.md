---
name: supabase-mail
description: Supabase dev_mailboxを使ったエージェント間メールの送受信手順。セッション開始時のメールチェック、送信、既読化の方法。
---

# Supabaseメール送受信スキル

## 概要

D-Planetのエージェント間（ドラ・アキ・ALL）の非同期通信に、Supabaseの`dev_mailbox`テーブルを使う。

## 前提

- 環境変数 `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が設定済みであること
- SUPABASE_URL: `https://dyimrnwbuzgcfeksezog.supabase.co`

## テーブル構造: dev_mailbox

| カラム | 型 | 説明 |
|--------|-----|------|
| id | serial | 自動採番 |
| from_agent | text | 送信元（ドラ / アキ / ALL） |
| to_agent | text | 宛先（ドラ / アキ / ALL） |
| subject | text | 件名 |
| content | text | 本文 |
| message_type | text | memo / review_request / spec_draft / decision / question / design_proposal |
| status | text | unread / read / actioned |
| priority | text | low / normal / high / critical |
| related_context | jsonb | 関連情報（in_reply_toなど） |
| created_at | timestamptz | 作成日時（自動） |
| read_at | timestamptz | 既読日時 |

## 重要: URLエンコーディング

日本語をSupabase REST APIのクエリパラメータに使う場合、**必ずURLエンコードする**。
生の日本語（`to_agent=eq.ドラ`）は400エラーになる。

| エージェント名 | URLエンコード |
|-------------|-------------|
| ドラ | `%E3%83%89%E3%83%A9` |
| アキ | `%E3%82%A2%E3%82%AD` |
| ALL | `ALL`（そのまま） |

また `in.(ドラ,ALL)` のような複合フィルタも400になりやすい。`eq.` で個別クエリを推奨。

## メール受信（未読チェック）

```bash
curl -s "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/dev_mailbox?to_agent=eq.%E3%83%89%E3%83%A9&status=eq.unread&order=created_at.desc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

ALL宛も別途チェック:
```bash
curl -s "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/dev_mailbox?to_agent=eq.ALL&status=eq.unread&order=created_at.desc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

## メール送信

```bash
curl -s -X POST "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/dev_mailbox" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "from_agent": "ドラ",
    "to_agent": "アキ",
    "subject": "件名",
    "content": "本文",
    "message_type": "memo",
    "status": "unread",
    "priority": "normal"
  }'
```

返信の場合は `related_context` に `{"in_reply_to": 元のメールID}` を入れる。

## メール既読化

```bash
curl -s -X PATCH "https://dyimrnwbuzgcfeksezog.supabase.co/rest/v1/dev_mailbox?id=eq.メールID" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status":"read","read_at":"'$(date -u +%Y-%m-%dT%H:%M:%S+00:00)'"}'
```

## サーバー側コード（TypeScript）

`server/supabaseClient.ts` に以下の関数が定義済み:

- `getUnreadMail(agentName)` — 未読メール取得
- `sendMail(msg)` — メール送信
- `markMailRead(mailId)` — 既読化

## セッション開始時のフロー

1. ドラ宛の未読メールを取得
2. ALL宛の未読メールも取得
3. 内容をあさひにサマリー報告
4. 必要に応じてアキに返信 or 天議に投稿
5. 確認したメールを既読にする

## トラブルシューティング

- **400エラー**: 日本語がURLエンコードされていない。`%E3%83%89%E3%83%A9` 等を使う
- **空の結果**: `from_agent` と `to_agent` を逆にしていないか確認
- **bodyカラム不在**: テーブルのカラム名は `content`（`body` ではない）
