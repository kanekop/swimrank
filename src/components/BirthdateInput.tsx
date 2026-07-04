/**
 * 生年月日の直接入力（年/月/日の3セル、数字キーパッド + 自動フォーカス送り）。
 * iOS の <input type="date"> は「今日」起点のカレンダーで誕生日入力に不向きなため、
 * TimeInput と同じ操作パターンに揃えた置き換え。
 * 不完全・不正な日付の間は onChange に null を渡す。
 */

import { useRef, useState } from 'react'
import styles from './BirthdateInput.module.css'

type Fields = { y: string; m: string; d: string }

function fieldsFromIso(iso?: string | null): Fields {
  if (!iso) return { y: '', m: '', d: '' }
  const [y = '', m = '', d = ''] = iso.split('-')
  return { y, m, d }
}

function fieldsToIso(f: Fields): string | null {
  if (f.y.length !== 4 || f.m === '' || f.d === '') return null
  const y = Number(f.y)
  const m = Number(f.m)
  const d = Number(f.d)
  const thisYear = new Date().getFullYear()
  if (y < 1900 || y > thisYear) return null
  if (m < 1 || m > 12) return null
  const daysInMonth = new Date(y, m, 0).getDate()
  if (d < 1 || d > daysInMonth) return null
  return `${f.y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export interface BirthdateInputProps {
  /** ISO 'YYYY-MM-DD' or null */
  value: string | null
  onChange: (iso: string | null) => void
}

export function BirthdateInput({ value, onChange }: BirthdateInputProps) {
  const [fields, setFields] = useState<Fields>(() => fieldsFromIso(value))
  const yRef = useRef<HTMLInputElement>(null)
  const mRef = useRef<HTMLInputElement>(null)
  const dRef = useRef<HTMLInputElement>(null)

  const thisYear = new Date().getFullYear()
  const yN = Number(fields.y)
  const mN = Number(fields.m)
  const dN = Number(fields.d)
  const yInvalid = fields.y.length === 4 && (yN < 1900 || yN > thisYear)
  const mInvalid = fields.m.length === 2 && (mN < 1 || mN > 12)
  const daysInMonth =
    fields.y.length === 4 && !yInvalid && fields.m.length === 2 && !mInvalid
      ? new Date(yN, mN, 0).getDate()
      : 31
  const dInvalid = fields.d.length === 2 && (dN < 1 || dN > daysInMonth)

  function commit(next: Fields, focus?: React.RefObject<HTMLInputElement>) {
    setFields(next)
    onChange(fieldsToIso(next))
    if (focus?.current) {
      requestAnimationFrame(() => {
        focus.current?.focus()
        focus.current?.select()
      })
    }
  }

  function onYear(raw: string) {
    const v = raw.replace(/\D/g, '').slice(0, 4)
    commit({ ...fields, y: v }, v.length === 4 ? mRef : undefined)
  }

  // 1桁目が確定値なら 0 埋めして自動送り（月: 2-9 → 02-09 / 日: 4-9 → 04-09）
  function onMonth(raw: string) {
    let v = raw.replace(/\D/g, '').slice(0, 2)
    if (v.length === 1 && Number(v) >= 2) v = '0' + v
    commit({ ...fields, m: v }, v.length === 2 ? dRef : undefined)
  }

  function onDay(raw: string) {
    let v = raw.replace(/\D/g, '').slice(0, 2)
    if (v.length === 1 && Number(v) >= 4) v = '0' + v
    commit({ ...fields, d: v })
  }

  function backTo(ref: React.RefObject<HTMLInputElement>) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
        ref.current?.focus()
      }
    }
  }

  const cell = (invalid: boolean) =>
    invalid ? `${styles.field} ${styles.invalid}` : styles.field

  return (
    <div className={styles.wrap} role="group" aria-label="生年月日">
      <label className={styles.cell}>
        <input
          ref={yRef}
          className={`${cell(yInvalid)} ${styles.year}`}
          value={fields.y}
          onChange={(e) => onYear(e.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="bday-year"
          placeholder="2013"
          aria-label="生まれた年（西暦4桁）"
        />
        <span className={styles.caption}>年</span>
      </label>
      <label className={styles.cell}>
        <input
          ref={mRef}
          className={cell(mInvalid)}
          value={fields.m}
          onChange={(e) => onMonth(e.target.value)}
          onKeyDown={backTo(yRef)}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="bday-month"
          placeholder="8"
          aria-label="生まれた月"
        />
        <span className={styles.caption}>月</span>
      </label>
      <label className={styles.cell}>
        <input
          ref={dRef}
          className={cell(dInvalid)}
          value={fields.d}
          onChange={(e) => onDay(e.target.value)}
          onKeyDown={backTo(mRef)}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="bday-day"
          placeholder="21"
          aria-label="生まれた日"
        />
        <span className={styles.caption}>日</span>
      </label>
    </div>
  )
}
