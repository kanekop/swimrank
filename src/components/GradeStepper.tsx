/**
 * 級ステッパー。大きな [−] 8級 [＋]（タップ目標48px）。
 * ＋で上位級（数字が大きい方、20級が最高位）、−で下位級へ。1..20でクランプ。
 */

import { gradeLabel } from '../core/labels'
import styles from './GradeStepper.module.css'

export interface GradeStepperProps {
  /** 現在の級（1..20） */
  grade: number
  onChange: (grade: number) => void
  min?: number
  max?: number
}

export function GradeStepper({ grade, onChange, min = 1, max = 20 }: GradeStepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label="級の選択">
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(Math.max(min, grade - 1))}
        disabled={grade <= min}
        aria-label="1つ下の級へ"
      >
        −
      </button>
      <span className={styles.value} aria-live="polite">
        {gradeLabel(grade)}
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(Math.min(max, grade + 1))}
        disabled={grade >= max}
        aria-label="1つ上の級へ"
      >
        ＋
      </button>
    </div>
  )
}
