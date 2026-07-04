/**
 * 横断ビューのテーブル。
 * - variant='stroke': 同じ距離で泳法横断（行ラベル=泳法名、固定5行）
 * - variant='distance': 同じ泳法で距離横断（行ラベル=距離）
 * - 基準種目の行はハイライト。種目なし/データなしはグレー行で行数固定
 * - 保存記録がある種目は「✓35.10→6級」注記
 * - 基準ありの行はタップでその種目のラダー表示（#/kentei/result?e=..、tなし）へ
 */

import { buildHash } from '../app/router'
import type { CrossRow } from '../core/cross'
import { eventKey, getEvent } from '../core/data'
import { gradeFor } from '../core/grade'
import { gradeLabel, strokeLabel } from '../core/labels'
import { formatCs } from '../core/time'
import type { Gender, RecordsMap, Stroke } from '../core/types'
import styles from './CrossTable.module.css'

export interface CrossTableProps {
  title: string
  variant: 'stroke' | 'distance'
  rows: CrossRow[]
  /** 基準種目（ハイライト対象） */
  baseStroke: Stroke
  baseDistance: number
  /** 保存記録の再判定用 */
  gender: Gender
  ageIdx: number
  records: RecordsMap
}

export function CrossTable({
  title,
  variant,
  rows,
  baseStroke,
  baseDistance,
  gender,
  ageIdx,
  records,
}: CrossTableProps) {
  function recordNote(row: CrossRow): string | null {
    if (row.status !== 'ok') return null
    const rec = records[eventKey(row.stroke, row.distance)]
    if (!rec) return null
    const ev = getEvent(gender, row.stroke, row.distance)
    if (!ev) return null
    const result = gradeFor(ev, ageIdx, rec.timeCs)
    const gradePart =
      result.status === 'graded' ? gradeLabel(result.grade) : result.status === 'kyugai' ? '級外' : '―'
    return `✓${formatCs(rec.timeCs)}→${gradePart}`
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {rows.map((row) => {
          const label = variant === 'stroke' ? strokeLabel[row.stroke] : `${row.distance}m`
          const highlighted =
            variant === 'stroke' ? row.stroke === baseStroke : row.distance === baseDistance
          const rowClass = highlighted ? `${styles.row} ${styles.highlight}` : styles.row
          const note = recordNote(row)

          if (row.status !== 'ok' || row.timeCs === null) {
            return (
              <li key={`${row.stroke}${row.distance}`} className={rowClass}>
                <span className={styles.label}>{label}</span>
                <span className={styles.mutedTime}>
                  {row.status === 'no-event' ? '―（種目なし）' : '―（データなし）'}
                </span>
              </li>
            )
          }

          return (
            <li key={`${row.stroke}${row.distance}`}>
              <a
                className={rowClass}
                href={buildHash({ name: 'kentei-result', eventKey: eventKey(row.stroke, row.distance) })}
              >
                <span className={styles.label}>{label}</span>
                <span className={styles.right}>
                  <span className={styles.time}>
                    {formatCs(row.timeCs)}
                    {row.estimated ? '*' : ''}
                  </span>
                  {note && <span className={styles.note}>{note}</span>}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
