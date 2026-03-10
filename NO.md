# NO.md — D-Planet 断捨離・禁止事項

## 古いものを残すな

- 旧テーブル名をコード・マイグレーション・replit.mdに残すな
- 旧ルート（/amahakari等）をApp.tsx・TerminalLayout・routes.tsに残すな
- 旧ページファイル（amahakari.tsx等）をpages/に残すな
- 旧APIルートファイル（routes-amahakari.ts等）をserver/に残すな
- 未使用のimport（CircleDot等）を残すな
- 複数DBに同名テーブルがある状態を残すな

## リネーム時の鉄則

- テーブルリネームは全DB（Supabase + Replit DB）の両方で実行しろ
- リネーム後は旧テーブルをDROPしろ
- マイグレーションのCREATE TABLE文も新名に合わせろ
- schema.tsのpgTable()第一引数を新名に変えろ
- replit.mdの全箇所を新名に更新しろ
- grepで旧名が0件になるまで確認しろ

## TDZパターン（本番のみクラッシュ）

- Reactコンポーネントでearly return（isLoading/!data）の前に分割代入由来の変数を使うな
- `const { user } = data` の前に `user.xxx` を参照するな
- 定数配列・オブジェクトの初期化でまだ定義されてない変数を使うな

## コード品質

- プレースホルダーやモックデータで本番に出すな
- エラーを握りつぶすな（空のcatchで黙殺するな）
- 英語のコメント・UIテキストを入れるな（日本語統一）

## DB操作

- executeSql()はReplit内蔵DBに接続する。SupabaseのDBを操作するときはpsql $SUPABASE_DATABASE_URLを使え
- 2つのDBの区別を忘れるな
