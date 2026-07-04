# スイムランク Design System — 使い方の規約

マスターズ水泳の級判定PWA「スイムランク」のコンポーネント群。日本語UI・モバイルファースト（375px基準、`--content-max-width: 560px`）。

## セットアップ
プロバイダー/ラッパーは**不要**。全コンポーネントはコンテキスト非依存で、propsだけで完結する。スタイルは `styles.css` の閉包（tokens + グローバル基礎 + コンポーネントCSS）で届く。

## ドメインの前提（propsの意味）
- **級（grade）**: 20級が最速・最高位、1級が最下位。1級より遅い = 級外（`grade: null`）。
- **タイム**: すべて**整数センチ秒**（`timeCs`）。44.54秒 = `4454`。表示形式は `44.54` / `1:38.55`（等幅フォント `var(--font-mono)` で桁を揃える）。
- 泳法コード: `Fr`自由形 `Bc`背泳ぎ `Br`平泳ぎ `Bt`バタフライ `IM`個人メドレー。

## スタイリングの語彙
コンポーネント内部はCSS Modules（クラス名は生成物なので**参照しない**）。自分のレイアウト接着コードは**CSSカスタムプロパティ**で書く（ライト/ダーク自動対応）:

- 色: `--color-bg` `--color-surface` `--color-surface-2` `--color-text` `--color-text-sub` `--color-primary` `--color-primary-strong` `--color-on-primary` `--color-accent` `--color-danger` `--color-highlight`（自分の行の黄ハイライト） `--color-border` `--color-disabled`
- 余白: `--space-1`(4px) 〜 `--space-6`(32px) / 角丸: `--radius-s`(8) `--radius-m`(12) `--radius-l`(20)
- 文字: `--text-xs`(12) `--text-s` `--text-m` `--text-l` `--text-xl` `--text-hero`(44) / `--font-body` `--font-mono`
- レイアウト: `--tap-target`(48px、全インタラクティブ要素の最小) `--tab-bar-height`(56px)

グローバルユーティリティクラスは**2つだけ**: `.btn-primary`（青・全幅）と `.btn-secondary`（青枠・全幅）。それ以外のクラス語彙は存在しない — 新しい見た目はトークン+インラインstyleか自前CSSで組む。

## 真実の在り処
`styles.css` → `_ds_bundle.css`（`:root` トークン定義とコンポーネントCSSすべて）。各コンポーネントのAPIは `components/general/<Name>/<Name>.d.ts`、使用例は `<Name>.prompt.md`。

## ロジックヘルパー（コンポーネントと同じ場所から import できる）
資格表の実データと判定ロジックがバンドルに同梱されている。ハードコードせずこれを使う:
- `formatCs(cs)` センチ秒→"44.54"/"1:38.55"、`partsToCs(min,sec,cent)` / `csToParts(cs)`
- `gradeLabel(8)`→"8級"、`strokeLabel.Br`→"平泳ぎ"、`eventLabel(stroke,distance)`→"50m平泳ぎ"、`ageGroupLabel(idx)`
- `swimAge(birthdate, now)` 水泳年齢（12/31時点）、`ageGroupIndex(age)`→0..14
- `getEvent(gender,'Br',50)` 種目データ取得 → `gradeFor(ev, ageIdx, timeCs)` 級判定 / `ladder(ev, ageIdx)` 級一覧20行
- `crossStroke(gender,distance,ageIdx,grade)` / `crossDistance(gender,stroke,ageIdx,grade)` 横断比較行
- 定数: `STROKES` `DISTANCES` `AGE_GROUPS` `GRADES`
例: `gradeFor(getEvent('M','Br',50), 6, 4454)` → `{status:'graded', grade:8, …}`（50-54区分男子50m平泳ぎ44.54秒=8級）

## 典型的な組み方（検証済みの実例を短縮）
```jsx
import { GradeBadge, LadderTable } from 'swimrank'

const rows = [3332, 3400, 3536].map((timeCs, i) => ({
  grade: 20 - i, timeCs, estimated: false,
}))

<section style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-m)', padding: 'var(--space-4)' }}>
  <GradeBadge grade={8} size="hero" />
  <LadderTable rows={rows} highlightGrade={8} />
  <button className="btn-primary">マイ記録に保存</button>
</section>
```
