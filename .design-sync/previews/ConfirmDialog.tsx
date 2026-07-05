import { ConfirmDialog } from 'swimrank'

// position:fixed のオーバーレイをカード枠内に閉じ込める
const frame = {
  position: 'relative',
  transform: 'translateZ(0)',
  height: 380,
  width: '100%',
  background: 'var(--color-surface-2)',
  borderRadius: 'var(--radius-m)',
  overflow: 'hidden',
} as const

/** 破壊的操作の確認（danger）。実行ボタンが danger 色 */
export const Danger = () => (
  <div style={frame}>
    <ConfirmDialog
      title="プロフィールをリセットしますか？"
      body="名前・生年月日・性別が消え、最初の設定画面に戻ります。この操作は取り消せません。"
      confirmLabel="リセットする"
      danger
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  </div>
)

/** 追加内容（チェックボックス等）を children で差し込める */
export const WithCheckbox = () => (
  <div style={frame}>
    <ConfirmDialog
      title="プロフィールをリセットしますか？"
      body="名前・生年月日・性別が消え、最初の設定画面に戻ります。この操作は取り消せません。"
      confirmLabel="リセットする"
      danger
      onConfirm={() => {}}
      onCancel={() => {}}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <input type="checkbox" style={{ width: 20, height: 20 }} />
        マイ記録もすべて削除する
      </label>
    </ConfirmDialog>
  </div>
)

/** 通常の確認（danger なし）。実行ボタンは primary 色 */
export const Neutral = () => (
  <div style={frame}>
    <ConfirmDialog
      title="変更を保存しますか？"
      body="編集した内容を保存します。"
      confirmLabel="保存する"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  </div>
)
