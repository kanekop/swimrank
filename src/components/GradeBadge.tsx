/**
 * 級バッジ。hero（判定結果画面の大表示）/ row（一覧行）の2サイズ。
 * grade=null は「級外」表示。
 */

import styles from './GradeBadge.module.css'

export interface GradeBadgeProps {
  /** 級（20..1）。級外は null */
  grade: number | null
  size?: 'hero' | 'row'
}

export function GradeBadge({ grade, size = 'row' }: GradeBadgeProps) {
  const label = grade === null ? '級外' : `${grade}級`
  const classes = [
    styles.badge,
    size === 'hero' ? styles.hero : styles.row,
    grade === null ? styles.kyugai : null,
  ]
    .filter(Boolean)
    .join(' ')
  return <span className={classes}>{label}</span>
}
