import type { Stroke } from './types'
import { AGE_GROUPS } from './data'

/** 泳法の日本語ラベル */
export const strokeLabel: Record<Stroke, string> = {
  Fr: '自由形',
  Bc: '背泳ぎ',
  Br: '平泳ぎ',
  Bt: 'バタフライ',
  IM: '個人メドレー',
}

/** 級ラベル。8 → "8級" */
export function gradeLabel(g: number): string {
  return `${g}級`
}

/** 種目ラベル。('Br', 50) → "50m平泳ぎ" */
export function eventLabel(stroke: Stroke, distance: number): string {
  return `${distance}m${strokeLabel[stroke]}`
}

/** 年齢区分ラベル。6 → "50-54" */
export function ageGroupLabel(idx: number): string {
  return AGE_GROUPS[idx] ?? ''
}
