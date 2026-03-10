---
name: minidora-review
description: D-Planet専用の実装品質レビュー（ミニドラチェック）。コードレビュー完了後、本番デプロイ前に実行する。本番ビルド検証、モバイルパフォーマンス、断捨離確認、minify互換性の4軸でチェック。「ミニドラ」「レビュー」「デプロイ前チェック」「品質確認」と言われたら発動。
---

# ミニドラレビュー（D-Planet実装品質チェック）

## 概要

architectによるコードレビュー（構造・設計の評価）の**後に**実行する、D-Planet固有の実装品質チェック。
architectが「設計は正しいか」を見るのに対し、ミニドラは「本番で壊れないか」を見る。

## いつ使うか

- コードレビュー（architect）完了後、デプロイ前
- あさひが「ミニドラチェック」「品質確認」と指示したとき
- 大きな機能変更・リファクタ後

## いつ使わないか

- 小さなテキスト修正やスタイル調整のみの場合
- architectによる設計レビューがまだ済んでいない場合（先にarchitectを呼ぶ）

## チェックフロー

### フェーズ1: 本番ビルド検証
```bash
npx vite build 2>&1
```
1. ビルドが成功するか確認
2. 警告メッセージを確認（特にchunk size警告）
3. 生成されたJSファイルをNode.jsで構文チェック:
```bash
node --check dist/public/assets/index-*.js 2>&1
```
4. **合否判定**: ビルド失敗 or 構文エラー → FAIL

### フェーズ2: モバイルパフォーマンス確認

変更したコンポーネントに以下のパターンがないか確認:

1. **大量DOM同時レンダリング**: 配列の`.map()`で条件なく全要素をレンダリングしていないか
2. **条件付きレンダリングの欠如**: タブ・アコーディオン等で非表示コンテンツもDOMに存在していないか
3. **重いイベントハンドラ**: scroll/resize/inputイベントにデバウンスなしの重い処理がないか
4. **画像の最適化**: 大きな画像にwidth/height指定やlazy loadingがないか

チェック方法（詳細は `references/checklist.md` を参照）:
```bash
grep -n '\.map(' <変更されたTSXファイル>
grep -n 'return.*\.map\|\.map(.*=>' <変更されたTSXファイル>
```
**合否判定**: 100件以上の配列を条件なく全レンダリング → WARN

### フェーズ3: 断捨離確認

1. **旧ルート残留**: `App.tsx` に使われていないRoute定義やリダイレクトがないか
2. **未使用インポート**: 変更ファイルでインポートされているが使われていないモジュール
3. **コメントアウトされたコード**: 意図的な残置でない限り削除すべき
4. **旧コンポーネント**: 新しいコンポーネントに置き換えられたのにファイルが残っていないか

チェック方法:
```bash
grep -n '<Route\|<Redirect\|Navigate' client/src/App.tsx
ls client/src/pages/
```
**合否判定**: 使われていないルート or コンポーネントファイル → WARN

### フェーズ4: minify互換性

1. **drizzle-ormのフロントエンド混入**: `shared/schema.ts` が `drizzle-orm` をインポートしていて、それがフロントエンドバンドルに含まれていないか
2. **循環参照**: フロントエンドコンポーネント間の循環インポート
3. **TDZソースコード検出（最重要）**: `const { user } = data;` の前に `user.xxx` を参照していないか。early return（isLoading/!data）の前に分割代入由来の変数を使っていないか。詳細は `references/checklist.md` を参照
4. **terser設定確認**: `vite.config.ts` で `minify: "terser"` が設定されているか

チェック方法:
```bash
grep -n 'minify' vite.config.ts
grep -rn "from.*shared/schema" client/src/ | head -20
grep -c 'drizzle' dist/public/assets/index-*.js 2>/dev/null || echo "バンドル未生成"
```
**合否判定**: drizzle-ormがバンドルに含まれている → WARN、terser未設定 → FAIL

## 出力フォーマット

```
## ミニドラレビュー結果

| チェック項目 | 結果 | 詳細 |
|---|---|---|
| 本番ビルド | PASS / FAIL | ... |
| モバイルパフォーマンス | PASS / WARN | ... |
| 断捨離 | PASS / WARN | ... |
| minify互換性 | PASS / FAIL | ... |

### 総合判定: デプロイ可 / デプロイ不可

### 検出事項（あれば）
- ...

### 推奨アクション（あれば）
- ...
```

## 品質ループ

FAILが1つでもある場合:
1. 修正を実施
2. ミニドラチェックを再実行
3. 全項目PASS or WARNのみになるまで繰り返す

WARNのみの場合:
- あさひに報告し、デプロイ判断を委ねる

## 過去のエラー事例

詳細は `references/checklist.md` を参照。

### 事例1: esbuildのTDZエラー（2026-03）
- esbuildのミニファイで変数初期化順序が崩れ、本番のみ `Cannot access 'f' before initialization` が発生
- 開発環境では再現不可。terserへの切り替えで解決

### 事例2: dashboard.tsxのTDZエラー（2026-03）
- `user` を `const { user } = data;` で定義する前に `user.isAdmin` を参照
- 本番のみ `Cannot access 'l' before initialization` が発生
- quickNavItemsの定義をuser定義後に移動して解決

### 事例3: ホワイトペーパーのモバイルフリーズ（2026-03）
- 9チャプター全てを同時レンダリング＋scrollIntoViewでモバイルが重くなった
- アクティブなチャプターだけ表示する条件付きレンダリングに変更して解決

### 事例4: 旧URLリダイレクト残留（2026-03）
- /hayroom, /tryroom, /dot-rally のリダイレクトが削除されずApp.tsxに残留
- 断捨離ポリシーに基づき全削除
