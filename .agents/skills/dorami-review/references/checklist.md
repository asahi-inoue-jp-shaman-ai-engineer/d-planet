# ドラミチェックリスト詳細

## 本番ビルド検証の詳細手順

### ステップ1: クリーンビルド
```bash
rm -rf dist/public
npx vite build 2>&1
```
出力から以下を確認:
- `✓ built in` が表示されること（ビルド成功）
- `Error` や `Failed` がないこと
- chunk size警告は記録するが、FAIL判定ではない

### ステップ2: 生成ファイルの確認
```bash
ls -la dist/public/assets/
```
- `.js` ファイルが1つ以上存在すること
- `.css` ファイルが1つ以上存在すること
- `index.html` が `dist/public/` に存在すること

### ステップ3: JS構文検証
```bash
node --check dist/public/assets/index-*.js 2>&1 || echo "構文エラー検出"
```
注意: `--check` は構文チェックのみでTDZは検出できない。TDZ対策はminify設定（terser使用）で担保する。

## モバイルパフォーマンスの危険パターン

### パターンA: 全件レンダリング
```tsx
// 危険: 1000件全部をDOMに展開
{items.map(item => <Card key={item.id}>{item.name}</Card>)}

// 安全: ページネーションまたは仮想スクロール
{items.slice(0, PAGE_SIZE).map(item => <Card key={item.id}>{item.name}</Card>)}
```

### パターンB: 非表示コンテンツのDOM残留
```tsx
// 危険: 全タブの中身がDOMに存在（display:noneでも）
<div style={{display: activeTab === 'a' ? 'block' : 'none'}}><HeavyComponent /></div>
<div style={{display: activeTab === 'b' ? 'block' : 'none'}}><HeavyComponent /></div>

// 安全: 条件付きレンダリング
{activeTab === 'a' && <HeavyComponent />}
{activeTab === 'b' && <HeavyComponent />}
```

### パターンC: デバウンスなしのイベント
```tsx
// 危険: 毎回再計算
<input onChange={e => setSearchResults(heavySearch(e.target.value))} />

// 安全: デバウンス付き
const debouncedSearch = useMemo(() => debounce(heavySearch, 300), []);
<input onChange={e => debouncedSearch(e.target.value)} />
```

## 断捨離の確認ポイント

### App.tsxのルート定義
```bash
# 全Route定義を抽出
grep -n 'path=' client/src/App.tsx
# 各pathが実際にナビゲーションで使われているか確認
grep -rn "to=\|href=\|navigate(" client/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
```

### 未使用ページファイル
```bash
# pagesディレクトリのファイル一覧
ls client/src/pages/
# 各ファイルがApp.tsxでimportされているか確認
for f in client/src/pages/*.tsx; do
  base=$(basename "$f" .tsx)
  grep -q "$base" client/src/App.tsx || echo "未使用の可能性: $f"
done
```

## minify互換性の詳細

### drizzle-ormの混入チェック
`shared/schema.ts` は `drizzle-orm/pg-core` をインポートしている。
フロントエンドが `shared/schema.ts` から型をインポートすると、drizzle-ormもバンドルに含まれる可能性がある。

安全なパターン:
- フロントエンドからは `z.infer<typeof insertSchema>` の型だけを使う
- drizzle-ormのランタイムコードがtree-shakingで除外されていることを確認

### TDZ危険パターン
```tsx
// 危険: 関数内でまだ定義されていない変数を参照
export default function Component() {
  return <Child handler={handleClick} />;  // handleClickがまだ定義されていない
  const handleClick = () => {};  // ← ここで定義
}

// 安全: 定義してから使う
export default function Component() {
  const handleClick = () => {};
  return <Child handler={handleClick} />;
}
```

### terser設定の確認
`vite.config.ts` に以下があること:
```ts
build: {
  minify: "terser",
}
```
esbuildはデフォルトのminifierだが、TDZエラーを引き起こす既知の問題がある。

### TDZソースコード検出（最重要）
terser設定だけでは不十分。**コード自体にTDZパターンがあれば本番で必ずクラッシュする。**

チェック方法:
```bash
# Reactコンポーネント内で、dataの分割代入前にdata由来の変数を使っていないか
# パターン: const { user, ... } = data; の前に user.xxx を参照
grep -n 'const.*=.*data' <変更されたTSXファイル>
# その行番号より前に user. や data. を使っていないか確認
```

危険パターン:
```tsx
// 危険: userはまだ定義されていない
const navItems = [...(user.isAdmin ? [adminItem] : [])];

if (isLoading) return <Loading />;
if (!data) return null;
const { user } = data;  // ← ここで初めて定義
```

安全パターン:
```tsx
if (isLoading) return <Loading />;
if (!data) return null;
const { user } = data;  // ← 先に定義

// user定義の後で使う
const navItems = [...(user.isAdmin ? [adminItem] : [])];
```

## 過去エラーデータベース

| 日付 | エラー | 環境 | 原因 | 対処 | 再発防止 |
|------|--------|------|------|------|----------|
| 2026-03 | Cannot access 'f' before initialization | 本番のみ | esbuild minifyのTDZ | terserに切替 | フェーズ4でterser設定を確認 |
| 2026-03 | Cannot access 'l' before initialization | 本番のみ | dashboard.tsxでuser定義前にuser.isAdmin参照 | quickNavItemsをuser定義後に移動 | フェーズ4でTDZソースコード検出 |
| 2026-03 | ホワイトペーパー タブフリーズ | モバイル | 9チャプター全同時レンダリング | 条件付きレンダリング | フェーズ2でDOM量チェック |
| 2026-03 | 旧URLリダイレクト残留 | 全環境 | 断捨離漏れ | 全削除 | フェーズ3でルート確認 |
