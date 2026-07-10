/**
 * 級一覧ラダー。20級（最高位）→1級の20行 + 最下部「― 級外」行。
 * - 自分の行はハイライト + ★、マウント時にハイライト行へ自動スクロール（中央寄せ）
 * - データなしセルは「―」、推定値は「44.08*」+ 脚注
 */

import { useEffect, useRef } from 'react'
import type { LadderRow } from 'swimrank-core'
import { gradeLabel } from 'swimrank-core'
import { formatCs } from 'swimrank-core'
import styles from './LadderTable.module.css'

export interface LadderTableProps {
  /** ladder(ev, ageIdx) の20行（20級→1級） */
  rows: LadderRow[]
  /** 自分の級（graded のとき）。ハイライト対象 */
  highlightGrade?: number | null
  /** 級外行をハイライトする */
  highlightKyugai?: boolean
}

export function LadderTable({ rows, highlightGrade = null, highlightKyugai = false }: LadderTableProps) {
  const hlRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    hlRef.current?.scrollIntoView({ block: 'center' })
  }, [highlightGrade, highlightKyugai])

  const anyEstimated = rows.some((r) => r.estimated)

  return (
    <div>
      <ul className={styles.list}>
        {rows.map((row) => {
          const hl = highlightGrade !== null && row.grade === highlightGrade
          return (
            <li
              key={row.grade}
              ref={hl ? hlRef : undefined}
              className={hl ? `${styles.row} ${styles.highlight}` : styles.row}
            >
              <span className={styles.grade}>{gradeLabel(row.grade)}</span>
              {hl && (
                <span className={styles.star} aria-label="あなたの級">
                  ★
                </span>
              )}
              <span className={row.timeCs === null ? `${styles.time} ${styles.empty}` : styles.time}>
                {row.timeCs === null ? '―' : `${formatCs(row.timeCs)}${row.estimated ? '*' : ''}`}
              </span>
            </li>
          )
        })}
        <li
          ref={highlightKyugai ? hlRef : undefined}
          className={
            highlightKyugai
              ? `${styles.row} ${styles.kyugaiRow} ${styles.highlight}`
              : `${styles.row} ${styles.kyugaiRow}`
          }
        >
          <span className={styles.grade}>級外</span>
          {highlightKyugai && (
            <span className={styles.star} aria-label="あなたの位置">
              ★
            </span>
          )}
          <span className={`${styles.time} ${styles.empty}`}>―</span>
        </li>
      </ul>
      {anyEstimated && <p className={styles.footnote}>* 推定値（元データ補修）</p>}
    </div>
  )
}
