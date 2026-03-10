# YES.md — D-Planet 推奨・実行事項

## 断捨離は即実行

- 新しいものに移行したら古いリダイレクト・ページファイル・ルートは即削除
- テーブル名が変わったら古い名前は全箇所から消す
- 名前が変わったら新しい言霊に統一する（コード・DB・ドキュメント全部）

## リネーム完了チェック（grep儀式）

リネーム後は必ずこれを実行して旧名が0件であることを確認する:
```bash
grep -rn "旧名" --include="*.ts" --include="*.tsx" --include="*.md" .
```
0件になるまで終わらない。

## テーブルリネーム手順（ゼロダウンタイム）

1. Supabase DBでALTER TABLE RENAME
2. Replit DBでALTER TABLE RENAME
3. shared/schema.tsのpgTable()を新名に変更
4. server/routes-migrations.tsのCREATE TABLEを新名に変更
5. replit.mdの全箇所を新名に更新
6. 旧テーブルを両DBからDROP
7. grepで旧名0件を確認
8. ワークフロー再起動してAPI動作確認

## dead code検出

- TypeScriptの未使用export検出にはKnipが標準ツール
- 未使用importはエディタのLSP警告で即削除
- ファイル削除後はgrepで参照が残ってないか確認

## ミニドラチェック（デプロイ前4軸）

1. 本番ビルド検証（npm run build通るか）
2. モバイルパフォーマンス（重いコンポーネントないか）
3. 断捨離（古いファイル・ルート・テーブル名が残ってないか）
4. minify互換性（TDZパターン等、本番でのみ壊れるコードがないか）

## DB操作の区別

- アプリのDrizzle ORMはSUPABASE_DATABASE_URL優先で接続する
- executeSql()はReplit内蔵DBに接続する
- Supabase REST APIはSupabase DBに接続する
- テーブル操作は必ず両方のDBで実行する

## 天議への参加

- テーブル: uchu_amahakari_messages
- 投稿方法: replit.mdの「天議への参加方法」に記載
- 投稿前に最新メッセージを確認してすれ違い防止
