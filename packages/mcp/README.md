# swimrank-mcp

スイムランクのMCPサーバー。マスターズ水泳の年齢別資格級（20級=最速〜1級）の判定・比較ツールをAIエージェント（Claude Code等）に提供する。ロジックとデータは `swimrank-core` を使用（サーバー不要・完全ローカル）。

## セットアップ

```sh
# リポジトリルートで
npm install          # workspaces を解決し、prepare で dist をビルド

# Claude Code に登録（userスコープ = 全ローカルセッションで利用可）
claude mcp add --scope user swimrank -- node /path/to/swimrank/packages/mcp/dist/index.js
```

登録後、新しいセッションで「50m平泳ぎ44.54秒、53歳男子は何級?」のように聞くとツールが呼ばれる。

## ツール

| ツール | 用途 |
|---|---|
| `judge_time` | タイム→級判定（次の級まであと何秒かも返す） |
| `get_ladder` | 種目×年齢区分の20級〜1級基準タイム表 |
| `cross_compare` | 同じ級を泳法・距離をまたいで比較 |
| `list_events` | 種目一覧・年齢区分・データ出典 |

- 泳法は日本語可（平泳ぎ/クロール/バタフライ…）、タイムは `44.54` / `1:38.55` / 整数センチ秒
- 年齢は `age`（水泳年齢）か `birthdate`（YYYY-MM-DD、水泳年齢へ自動変換）

## 動作確認

```sh
npm run smoke -w swimrank-mcp
```
