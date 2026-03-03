# QA Error Discovery Agent — 実装仕様書

## 概要

デプロイ済みWebアプリを自律的に操作し、エラー・バグ挙動を発見して指定のAPIエンドポイントに報告する、独立したQAエージェントシステム。

D-Planet専用ではなく、**あらゆるWebアプリに対して使える汎用ツール**として設計する。

---

## 技術スタック

- **言語**: Python 3.11+
- **ブラウザ自動化**: [browser-use](https://github.com/browser-use/browser-use)（LLM + Playwright）
- **LLM**: OpenRouter経由（推奨モデル: `qwen/qwen3-30b-a3b` または `google/gemini-flash-1.5`）
- **Webフレームワーク**: FastAPI + Jinja2テンプレート（シンプルなUI）
- **依存関係管理**: pip / requirements.txt

---

## ディレクトリ構成

```
qa-agent/
├── main.py              # FastAPIエントリーポイント
├── agent.py             # QAエージェント本体
├── reporter.py          # エラー収集・フィードバック投稿
├── templates/
│   └── index.html       # 操作UI（シンプルなフォーム）
├── requirements.txt
└── .env.example
```

---

## 環境変数

```env
OPENROUTER_API_KEY=sk-or-...
LLM_MODEL=qwen/qwen3-30b-a3b
```

---

## UI仕様（index.html）

シンプルなフォーム1枚。以下の入力項目を持つ：

| フィールド | 型 | 説明 |
|---|---|---|
| `target_url` | text | テスト対象のURL（例: `https://d-planet.replit.app`） |
| `login_url` | text | ログインページのURL（任意） |
| `username` | text | ログインID（任意） |
| `password` | password | パスワード（任意） |
| `feedback_url` | text | エラー報告先のAPIエンドポイント（任意） |
| `feedback_token` | password | 報告先APIの認証トークン（任意） |
| `test_depth` | select | 巡回の深さ: `shallow`（主要ページのみ）/ `deep`（全リンク） |

「実行」ボタンを押すと`POST /run`を叩いて、結果をリアルタイムで表示する（SSEまたはポーリング）。

---

## APIエンドポイント

### `GET /`
UIのHTMLを返す。

### `POST /run`
QAエージェントを起動する。

**リクエストボディ（JSON）:**
```json
{
  "target_url": "https://example.com",
  "login_url": "https://example.com/login",
  "username": "test@example.com",
  "password": "password123",
  "feedback_url": "https://example.com/api/feedback",
  "feedback_token": "Bearer xxxxx",
  "test_depth": "deep"
}
```

**レスポンス:**
```json
{
  "run_id": "uuid",
  "status": "started"
}
```

### `GET /status/{run_id}`
実行状況をポーリングで取得する。

```json
{
  "run_id": "uuid",
  "status": "running" | "completed" | "error",
  "progress": "家族会議ページをテスト中...",
  "errors_found": 2,
  "report": [...]
}
```

---

## エージェント本体（agent.py）

### 実行フロー

```
1. ブラウザ起動（Playwright / Headless Chrome）
2. ログイン（login_url + credentials が指定された場合）
3. Phase 1: クロール
   - target_urlをスタートに全リンクを収集
   - 各URLにアクセスしてHTTPエラー（4xx/5xx）を記録
   - JSコンソールエラーを記録
4. Phase 2: アクションテスト（LLMが自律判断）
   - 各ページでLLMが「テストすべきアクション」を判断
   - フォーム送信、ボタンクリック、空欄送信、異常値入力を試みる
   - エラー・クラッシュを記録
5. Phase 3: レポート生成
   - 発見したエラーを構造化データにまとめる
   - feedback_urlが指定されていればPOSTする
```

### browser-useへの指示プロンプト（テンプレート）

```python
AGENT_TASK_TEMPLATE = """
あなたはWebアプリのQAエンジニアです。以下のWebサービスを徹底的にテストしてください。

【テスト対象】
URL: {target_url}

【目的】
エラーが起きる挙動を発見すること。具体的には：
- ページが壊れる操作
- フォームの送信でエラーが出る操作
- ボタンを押しても反応しない箇所
- 予期しないページ遷移やクラッシュ
- 空欄・異常値・連続クリックなど「意地悪な操作」でのエラー

【行動原則】
- 一般的なユーザーがやりそうな操作を全部試す
- エラーが起きなかった機能は「クリア」として記録
- エラーが起きたら「どのページで・何をしたら・どうなったか」を正確に記録
- UXとして「わかりにくい」「おかしい」と感じた点もメモする
- 確認ダイアログや警告は適宜対応して次に進む
- ログアウトはしない

【報告形式】
各エラーについて：
- page_url: エラーが起きたURL
- action: 実行した操作
- error_type: error / ux_issue / crash
- description: 何が起きたかの説明
- severity: high / medium / low
"""
```

---

## エラー収集（reporter.py）

### エラーオブジェクトの構造

```python
@dataclass
class QAError:
    page_url: str          # エラーが発生したURL
    action: str            # 実行した操作
    error_type: str        # "js_error" | "http_error" | "crash" | "ux_issue"
    description: str       # エラーの説明
    severity: str          # "high" | "medium" | "low"
    screenshot_b64: str    # スクリーンショット（base64、任意）
    timestamp: str         # ISO形式のタイムスタンプ
```

### フィードバック投稿（feedback_url指定時）

D-Planetへの投稿例：

```python
async def post_to_feedback(feedback_url: str, token: str, error: QAError):
    payload = {
        "title": f"[QA] {error.error_type}: {error.page_url}",
        "description": f"""
**操作**: {error.action}
**エラー内容**: {error.description}
**深刻度**: {error.severity}
**URL**: {error.page_url}
        """.strip(),
        "category": "bug"
    }
    headers = {"Authorization": token, "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        await client.post(feedback_url, json=payload, headers=headers)
```

D-Planetの場合、`feedback_url` = `https://d-planet.replit.app/api/feedback`、`feedback_token` = ゼノのセッショントークンまたはAPIキー。

---

## requirements.txt

```
fastapi
uvicorn
browser-use
playwright
httpx
python-dotenv
jinja2
python-multipart
```

インストール後に必要なコマンド：
```bash
playwright install chromium
```

---

## 実装の注意点

1. **非同期実行**: QAの実行は時間がかかるため、バックグラウンドタスクで動かすこと（`asyncio` + `BackgroundTasks`）
2. **run_idで管理**: 複数回の実行を識別できるようrun_idを振る（UUIDで可）
3. **タイムアウト**: 1回の実行は最大30分でタイムアウト。フリーズ防止
4. **エラーが0件でも報告**: 「エラーなし」のレポートも出力する
5. **ログイン情報はメモリのみ**: DBや永続化ストレージに保存しない

---

## D-Planetでの使用例

```
target_url: https://d-planet.replit.app
login_url: https://d-planet.replit.app/login
username: xeno@d-planet.local
password: xeno2026
feedback_url: https://d-planet.replit.app/api/feedback
feedback_token: （ゼノのセッションCookieまたはAPIトークン）
test_depth: deep
```

---

## 将来の拡張案（今は作らなくていい）

- スケジュール実行（デプロイフック連携）
- Slack通知
- スクリーンショット付きレポート
- 複数URL並列テスト
- UXスコアリング（LLMによる主観評価）
