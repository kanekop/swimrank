import { Toast } from 'swimrank'

// transform付きコンテナは position:fixed の包含ブロックになるため、
// タブバー上に固定表示されるトーストをカード枠内に閉じ込められる。
const frame = {
  position: 'relative',
  transform: 'translateZ(0)',
  height: 150,
  background: 'var(--color-bg)',
  borderRadius: 'var(--radius-m)',
  overflow: 'hidden',
} as const

/** マイ記録への保存直後に出る確認トースト（アプリではタブバー上に固定表示） */
export const Saved = () => (
  <div style={frame}>
    <Toast message="マイ記録に保存しました" onDismiss={() => {}} durationMs={999999} />
  </div>
)

/** マイ記録の削除確認トースト */
export const Deleted = () => (
  <div style={frame}>
    <Toast message="マイ記録を削除しました" onDismiss={() => {}} durationMs={999999} />
  </div>
)
