/**
 * 保存確認用トースト。message が非 null の間だけ表示し、
 * durationMs 経過で onDismiss を呼ぶ（親が message を null に戻して消滅）。
 * タブバーの上に固定表示。
 */

import { useEffect } from 'react'
import styles from './Toast.module.css'

export interface ToastProps {
  /** 表示する文言。null で非表示 */
  message: string | null
  /** 自動消滅時に呼ばれる（親側で message を null にする） */
  onDismiss: () => void
  /** 自動消滅までのミリ秒（既定 2400ms） */
  durationMs?: number
}

export function Toast({ message, onDismiss, durationMs = 2400 }: ToastProps) {
  useEffect(() => {
    if (message === null) return
    const id = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(id)
  }, [message, durationMs, onDismiss])

  if (message === null) return null

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {message}
    </div>
  )
}
