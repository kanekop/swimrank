/**
 * タイム3分割入力ウィジェット（分 / 秒 / 1/100秒）。
 * - 分・秒は2桁入力で次フィールドへ自動フォーカス移動
 * - フォーカス時は全選択、空フィールドで Backspace → 前フィールドへ
 * - 検証: 分0-99 / 秒0-59 / 1/100秒0-99。不正は赤枠 + onChange(null)
 * - 全フィールド空・合計0 も onChange(null)（親は判定ボタンを disabled にする）
 * - value / initialCs は初期表示にのみ使用し、編集中の文字列状態は内部で管理する
 */

import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { csToParts, isValidParts, partsToCs } from '../core/time'
import styles from './TimeInput.module.css'

export interface TimeInputProps {
  /** 現在値（整数センチ秒）。初期表示にのみ使用 */
  value: number | null
  /** 入力が変わるたびに呼ばれる。不完全・不正な入力は null */
  onChange: (cs: number | null) => void
  /** プレフィル値（v2 ストップウォッチ連携 #/kentei?t=8345 用）。value より優先 */
  initialCs?: number | null
}

interface Fields {
  min: string
  sec: string
  cent: string
}

function fieldsFromCs(cs: number | null | undefined): Fields {
  if (cs == null || cs <= 0) return { min: '', sec: '', cent: '' }
  const p = csToParts(cs)
  return {
    min: p.min > 0 ? String(p.min) : '',
    sec: String(p.sec).padStart(2, '0'),
    cent: String(p.cent).padStart(2, '0'),
  }
}

function fieldsToCs(f: Fields): number | null {
  if (f.min === '' && f.sec === '' && f.cent === '') return null
  const min = f.min === '' ? 0 : Number(f.min)
  const sec = f.sec === '' ? 0 : Number(f.sec)
  const cent = f.cent === '' ? 0 : Number(f.cent)
  if (!isValidParts(min, sec, cent)) return null
  const cs = partsToCs(min, sec, cent)
  return cs > 0 ? cs : null
}

export function TimeInput({ value, onChange, initialCs }: TimeInputProps) {
  const [fields, setFields] = useState<Fields>(() => fieldsFromCs(initialCs ?? value))
  const minRef = useRef<HTMLInputElement>(null)
  const secRef = useRef<HTMLInputElement>(null)
  const centRef = useRef<HTMLInputElement>(null)

  // 2桁制限のため分・1/100は範囲超過し得ない。不正になり得るのは秒（>59）のみ
  const secInvalid = fields.sec !== '' && Number(fields.sec) > 59

  function update(name: keyof Fields, raw: string) {
    const v = raw.replace(/\D/g, '').slice(0, 2)
    const next: Fields = { ...fields, [name]: v }
    setFields(next)
    onChange(fieldsToCs(next))
    if (v.length === 2) {
      if (name === 'min') secRef.current?.focus()
      else if (name === 'sec') centRef.current?.focus()
    }
  }

  function backspaceToPrev(name: keyof Fields, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Backspace' || fields[name] !== '') return
    e.preventDefault()
    if (name === 'sec') minRef.current?.focus()
    else if (name === 'cent') secRef.current?.focus()
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.cell}>
        <input
          ref={minRef}
          className={styles.field}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="0"
          value={fields.min}
          onChange={(e) => update('min', e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="分"
        />
        <span className={styles.caption}>分</span>
      </label>
      <span className={styles.sep} aria-hidden="true">
        :
      </span>
      <label className={styles.cell}>
        <input
          ref={secRef}
          className={secInvalid ? `${styles.field} ${styles.invalid}` : styles.field}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={fields.sec}
          onChange={(e) => update('sec', e.target.value)}
          onKeyDown={(e) => backspaceToPrev('sec', e)}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="秒"
          aria-invalid={secInvalid || undefined}
        />
        <span className={styles.caption}>秒</span>
      </label>
      <span className={styles.sep} aria-hidden="true">
        .
      </span>
      <label className={styles.cell}>
        <input
          ref={centRef}
          className={styles.field}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="00"
          value={fields.cent}
          onChange={(e) => update('cent', e.target.value)}
          onKeyDown={(e) => backspaceToPrev('cent', e)}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="100分の1秒"
        />
        <span className={styles.caption}>1/100</span>
      </label>
    </div>
  )
}
