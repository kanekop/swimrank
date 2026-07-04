/**
 * 級判定フォーム #/kentei
 * 泳法チップ → 距離チップ（泳法で変化）→ TimeInput + ライブプレビュー → 判定する。
 * 最後に使った泳法/距離を lastEvent から復元。判定時に lastEvent を保存。
 */

import { useState } from 'react'
import { navigate } from '../app/router'
import { DISTANCES, STROKES, eventKey } from '../core/data'
import { strokeLabel } from '../core/labels'
import { csToParts } from '../core/time'
import type { Stroke } from '../core/types'
import type { LastEvent } from '../hooks/useLastEvent'
import { ChipSelector } from '../components/ChipSelector'
import { TimeInput } from '../components/TimeInput'
import styles from './Kentei.module.css'

const STROKE_OPTIONS: readonly { value: Stroke; label: string }[] = STROKES.map((s) => ({
  value: s,
  label: strokeLabel[s],
}))

/** ライブプレビュー「0:44.32」形式（分は常に表示） */
function previewText(cs: number | null): string {
  if (cs === null) return '-:--.--'
  const p = csToParts(cs)
  return `${p.min}:${String(p.sec).padStart(2, '0')}.${String(p.cent).padStart(2, '0')}`
}

export interface KenteiProps {
  lastEvent: LastEvent | null
  setLastEvent: (e: LastEvent) => void
  /** #/kentei?t=8345 のプレフィル（v2 ストップウォッチ連携） */
  initialCs: number | null
}

export function Kentei({ lastEvent, setLastEvent, initialCs }: KenteiProps) {
  const [stroke, setStroke] = useState<Stroke | null>(lastEvent?.stroke ?? null)
  const [distance, setDistance] = useState<number | null>(
    lastEvent && DISTANCES[lastEvent.stroke].includes(lastEvent.distance) ? lastEvent.distance : null,
  )
  const [timeCs, setTimeCs] = useState<number | null>(initialCs)

  const canSubmit = stroke !== null && distance !== null && timeCs !== null

  function handleStrokeChange(s: Stroke) {
    setStroke(s)
    if (distance !== null && !DISTANCES[s].includes(distance)) setDistance(null)
  }

  function handleSubmit() {
    if (stroke === null || distance === null || timeCs === null) return
    setLastEvent({ stroke, distance })
    navigate({ name: 'kentei-result', eventKey: eventKey(stroke, distance), timeCs })
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>ランク判定</h1>

      <div className={styles.field}>
        <span className={styles.label}>種目</span>
        <ChipSelector options={STROKE_OPTIONS} value={stroke} onChange={handleStrokeChange} label="種目" />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>距離</span>
        {stroke === null ? (
          <p className={styles.hint}>先に種目を選んでください</p>
        ) : (
          <ChipSelector
            options={DISTANCES[stroke].map((d) => ({ value: d, label: `${d}m` }))}
            value={distance}
            onChange={setDistance}
            label="距離"
          />
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>タイム</span>
        <TimeInput value={timeCs} onChange={setTimeCs} initialCs={initialCs} />
        <p className={timeCs === null ? `${styles.preview} ${styles.previewEmpty}` : styles.preview}>
          {previewText(timeCs)}
        </p>
      </div>

      <button type="button" className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
        判定する
      </button>
    </div>
  )
}
