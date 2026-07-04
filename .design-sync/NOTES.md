# design-sync NOTES — swimrank

## リポジトリの形
- アプリリポジトリでありパッケージではない。ライブラリ用 dist なし → `--entry ./src/components/index.ts`（バレル。DS同期専用でアプリ本体は import しない）を必ず渡す。
- バレルは `../styles/global.css` を import しており、esbuild が tokens.css を含む全CSSを `_ds_bundle.css` に解決する。`cfg.cssEntry`/`cfg.tokensGlob` は使わない（tokensGlob は node_modules のトークンパッケージ専用で、リポジトリ内ファイルには効かない — 初回同期でハマった点）。
- バレルはコンポーネント8個に加えてコアヘルパー（formatCs / gradeLabel / gradeFor / getEvent / AGE_GROUPS 等）も export する。小文字・大文字定数なのでコンポーネント自動判定とは衝突しない（component list は componentSrcMap で固定）。

## ビルドコマンド
```
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./node_modules --entry ./src/components/index.ts --out ./ds-bundle
```

## 教訓
- **cfg.overrides を変更したら必ず package-build.mjs でフル再ビルドしてから preview-rebuild すること。** ウェーブ実行中に overrides（TabBar/Toast の cardMode/viewport）を追加したため、両サブエージェントが [CONFIG_STALE] でブロックされた。次回は overrides をウェーブ開始前に確定させる。
- TabBar / Toast は position:fixed のため cardMode single + viewport が必須（config 設定済み）。
- Toast のプレビューは durationMs=999999 で自動消滅タイマーを無効化しないとスクリーンショットとレースする。
- プレビューの実データ（男子50m平泳ぎ50-54の基準タイム等）は src/data/sikaku.json 由来の値を手で焼き込んである。

## Known render warns
- なし（初回同期時点。validate 警告ゼロ）。

## Re-sync risks
- プレビューに焼き込んだ基準タイム値は sikaku.json が更新されても自動追従しない（表示例としては害なし。ズレが気になったら previews/*.tsx の値を更新）。
- CrossTable プレビューの ✓記録→級 注記はバンドル内の実データで再判定される — 資格表データを更新すると注記の級が変わりうる（それが正しい挙動）。
- バレル（src/components/index.ts）にコンポーネントを追加したら componentSrcMap にも追記が必要。
- 検証環境: playwright + chromium は .ds-sync/node_modules に導入（リポジトリ本体の package.json には入れていない）。
