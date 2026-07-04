/**
 * 汎用の大型チップ単一選択（泳法・距離・性別トグルなどに使用）。
 * タップ目標 48px+、折返しあり。role=radiogroup / radio でアクセシブルに。
 */

import styles from './ChipSelector.module.css'

export interface ChipOption<V extends string | number> {
  value: V
  label: string
}

export interface ChipSelectorProps<V extends string | number> {
  options: readonly ChipOption<V>[]
  /** 選択中の値。未選択は null */
  value: V | null
  onChange: (value: V) => void
  /** radiogroup の aria-label（例:「種目」「距離」） */
  label?: string
}

export function ChipSelector<V extends string | number>({
  options,
  value,
  onChange,
  label,
}: ChipSelectorProps<V>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? `${styles.chip} ${styles.selected}` : styles.chip}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
