/**
 * 確認ダイアログ（モーダル）。破壊的操作の確認に使う。
 * タイトル・本文・任意の追加内容（children、例: チェックボックス）を受け取り、
 * キャンセル / 実行の2ボタンを出す。danger=true で実行ボタンを danger 色に。
 */

import type { ReactNode } from 'react'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** ボタンの上に差し込む追加内容（チェックボックス等） */
  children?: ReactNode
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = 'キャンセル',
  danger = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
        {children}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? `${styles.confirm} ${styles.danger}` : styles.confirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
