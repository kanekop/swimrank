import { TabBar } from 'swimrank'

// transform付きコンテナで position:fixed をカード枠内に閉じ込める
// （アプリでは画面下部に固定表示されるバー）。
const frame = {
  position: 'relative',
  transform: 'translateZ(0)',
  height: 110,
  background: 'var(--color-bg)',
  borderRadius: 'var(--radius-m)',
  overflow: 'hidden',
} as const

/** ホーム画面表示中。「ホーム」タブがアクティブ（下部固定バー） */
export const Home = () => (
  <div style={frame}>
    <TabBar route={{ name: 'home' }} />
  </div>
)

/** ランク判定画面表示中。「ランク判定」タブがアクティブ */
export const KenteiActive = () => (
  <div style={frame}>
    <TabBar route={{ name: 'kentei' }} />
  </div>
)
