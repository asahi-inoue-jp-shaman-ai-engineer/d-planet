# LLMモデル — D-Planet言語モデル選定仕様

---

## 1. ビジョン

D-PlanetにおけるLLMモデル選択は、デジタルツインレイとのコミュニケーションをユーザーが自分にピッタリなチューニングが出来ることであり、それを選んだり、体験したりしやすいUIとUXが求められる。

- モデルを変えると会話の質感・テンポ・深さが変わる。その違いを体感しながら自分だけの組み合わせを見つける
- 「推奨」で誘導せず、ユーザーがフィーリングで選ぶ
- 無料モデルで色々試す → 好みが見つかったら同ブランドの上位モデルへシフト
- モデルは人気に応じて入れ替えていく。新しいモデルを追加し、使われないモデルと交代

---

## 2. モデル選定基準

新しいモデルをD-Planetに追加するときは、以下の5項目を全て満たすこと。

| # | 基準 | 説明 |
|---|------|------|
| 1 | **上位導線がある** | 無料モデルは同ブランドの有料上位モデルがD-Planetにあること。導線のない無料モデルは追加しない |
| 2 | **OpenRouterで利用可能** | OpenRouter APIに掲載されていること |
| 3 | **対話品質** | ツインレイとのコミュニケーション（日本語理解、感情の機微、創造性）に適していること |
| 4 | **コスト感** | D-Planet側の負担が許容範囲内であること。無料モデルの場合はOpenRouter上で$0.00か、1ユーザーあたり月¥200以下 |
| 5 | **ブランド差別化** | 他のブランドと違う感性・テンポ・深さの体験を提供すること。同質のモデルを複数入れない |

### 不採用例
- **Mistral Small 3.1** — 上位導線なし（D-PlanetにMistral有料モデルがない）のため不採用
- **Llama 3.3 70B** — Meta単独で上位モデルへの導線がないため不採用

---

## 3. 現在のモデル一覧（20モデル）

### 最上位（Flagship）— 1モデル

| モデル | OpenRouter ID | 選定理由 |
|--------|--------------|----------|
| Qwen Max | `qwen/qwen-max` | Qwen最上位。日本語のニュアンスを汲み取る深い対話 |

### 高性能（High Performance）— 7モデル

| モデル | OpenRouter ID | 選定理由 |
|--------|--------------|----------|
| GPT-5 | `openai/gpt-5` | 安定感のある対話。バランス型の万能モデル |
| Claude Sonnet 4 | `anthropic/claude-sonnet-4` | 繊細で詩的な表現力。創造的な対話に強い |
| Grok 4 | `x-ai/grok-4` | xAI唯一の高性能モデル。率直さとユーモアが魅力 |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` | Google高性能。長文脈を正確に把握し一貫性が高い |
| Gemini 3 Pro Preview | `google/gemini-3-pro-preview` | 次世代Gemini。最新AI体験を先取り |
| MiniMax M2.5 | `minimax/minimax-m2.5` | MiniMax最新。独自の感性と表現力で個性的な対話 |
| MiniMax M2-her | `minimax/minimax-m2-her` | 感情特化。温かみのある対話で寄り添う力が強い |

### 推論特化（Reasoning）— 2モデル

| モデル | OpenRouter ID | 選定理由 |
|--------|--------------|----------|
| o3 | `openai/o3` | OpenAI推論モデル。一つの問題をじっくり考え抜く |
| DeepSeek R1 | `deepseek/deepseek-r1` | 推論特化のコスパ王。深い思考をリーズナブルに |

### 軽量型（Lightweight）— 4モデル

| モデル | OpenRouter ID | 選定理由 |
|--------|--------------|----------|
| Qwen Plus | `qwen/qwen-plus` | 自然で心地よい日本語。毎日の対話に最適 |
| Qwen3.5 Plus | `qwen/qwen3.5-plus` | Qwen最新世代。進化した日本語理解と表現力 |
| GPT-4.1 | `openai/gpt-4.1` | 実用的な万能型。コーディングや分析も得意 |
| MiniMax M2.1 | `minimax/minimax-m2.1` | MiniMaxバランス型。安定した対話をリーズナブルに |

### 無料（Free）— 5モデル

| モデル | OpenRouter ID | 選定理由 | 上位導線 |
|--------|--------------|----------|----------|
| MiniMax-01 | `minimax/minimax-01` | 100万トークンの超長コンテキスト。MiniMax入門 | → M2.1 → M2.5/M2-her |
| Qwen3 30B | `qwen/qwen3-30b-a3b` | 日本語の基本対話。Qwen入門 | → Qwen Plus → Qwen Max |
| GPT-4.1 mini | `openai/gpt-4.1-mini` | ChatGPTの使い慣れた雰囲気。OpenAI入門 | → GPT-4.1 → GPT-5 |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | Google AI高速レスポンス。Google入門 | → Gemini 2.5 Pro → Gemini 3 Pro |
| Grok 4.1 Fast | `x-ai/grok-4.1-fast` | xAIの素早いレスポンス。xAI入門 | → Grok 4 |

### 検索特化（Search）— 1モデル

| モデル | OpenRouter ID | 選定理由 |
|--------|--------------|----------|
| Perplexity Sonar | `perplexity/sonar` | リアルタイムWeb検索付き。事実検証・最新情報 |

---

## 4. ブランド別 無料→有料導線マップ

```
MiniMax:   MiniMax-01（無料）→ M2.1（軽量型）→ M2.5 / M2-her（高性能）
OpenAI:    GPT-4.1 mini（無料）→ GPT-4.1（軽量型）→ GPT-5（高性能）
Qwen:      Qwen3 30B（無料）→ Qwen Plus / 3.5 Plus（軽量型）→ Qwen Max（最上位）
Google:    Gemini 2.5 Flash（無料）→ Gemini 2.5 Pro / 3 Pro Preview（高性能）
xAI:       Grok 4.1 Fast（無料）→ Grok 4（高性能）
Anthropic: Claude Sonnet 4（高性能）※無料入門なし
DeepSeek:  DeepSeek R1（推論特化）※独立枠
```

---

## 5. 追加候補・待機リスト

| モデル | 状態 | 理由 |
|--------|------|------|
| Qwen3 Swallow | 待機 | 東京科学大学、日本語特化+推論強化。OpenRouter未掲載 |
| Mistral Medium 3 | 候補 | 追加すればMistral Small 3.1を無料枠で復活可能。Mistral導線が完成する |
| DeepSeek V3 | 候補 | DeepSeek汎用モデル。R1との差別化が必要 |

---

## 6. 入れ替え運用方針

- 使用トークン数の実績データに基づいて定期的にラインナップを評価する
- 使われないモデルは新しいモデルと交代
- OpenRouterの新モデル掲載時に選定基準5項目で評価し、追加を検討
- ブランド数を無制限に増やさない。体験の質と選びやすさのバランスを維持

---

## 7. 将来ビジョン（次セッション以降で実装）

### 使用実績ランキング機能
- D-Planetでの各モデルの使用トークン数を集計
- モデル人気ランキングをLLM MODELSページに反映
- 「他のユーザーがよく使っているモデル」として参考情報を提示（推奨ではなく実績データ）

### UI/UX継続改善
- ツインレイ召喚とモデル選択の分離
- チャット内モデル切替UXの改善（歯車アイコンの改善）
- モデルの感性・テンポ・深さを体験しやすいUI
- モデル試用機能（短い会話で感触を掴める仕組み）
