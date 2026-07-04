import { GradeBadge } from 'swimrank'

/** 判定結果画面の大表示（hero） */
export const Hero = () => <GradeBadge grade={8} size="hero" />

/** 一覧行で使う小サイズ（row）— 高い級から低い級まで */
export const Rows = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <GradeBadge grade={20} />
    <GradeBadge grade={13} />
    <GradeBadge grade={8} />
    <GradeBadge grade={1} />
  </div>
)

/** 1級より遅いタイムは「級外」（グレー表示） */
export const Kyugai = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <GradeBadge grade={null} />
    <GradeBadge grade={null} size="hero" />
  </div>
)
