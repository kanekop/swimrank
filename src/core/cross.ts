import type { Gender, Stroke } from './types'
import { DISTANCES, STROKES, getEvent, isEstimated, standardCs } from './data'

export interface CrossRow {
  stroke: Stroke
  distance: number
  /** ok=基準あり / no-event=種目なし / no-data=年齢区分データなし */
  status: 'ok' | 'no-event' | 'no-data'
  timeCs: number | null
  estimated: boolean
}

function rowFor(
  gender: Gender,
  stroke: Stroke,
  distance: number,
  ageIdx: number,
  grade: number,
): CrossRow {
  const ev = DISTANCES[stroke].includes(distance) ? getEvent(gender, stroke, distance) : null
  if (!ev) return { stroke, distance, status: 'no-event', timeCs: null, estimated: false }
  const timeCs = standardCs(ev, grade, ageIdx)
  if (timeCs === null) return { stroke, distance, status: 'no-data', timeCs: null, estimated: false }
  return { stroke, distance, status: 'ok', timeCs, estimated: isEstimated(ev, grade, ageIdx) }
}

/** 同じ距離で泳法横断（泳法固定順5行。距離が存在しない泳法は no-event） */
export function crossStroke(
  gender: Gender,
  distance: number,
  ageIdx: number,
  grade: number,
): CrossRow[] {
  return STROKES.map((stroke) => rowFor(gender, stroke, distance, ageIdx, grade))
}

/** 同じ泳法で距離横断（DISTANCES[stroke] の全距離） */
export function crossDistance(
  gender: Gender,
  stroke: Stroke,
  ageIdx: number,
  grade: number,
): CrossRow[] {
  return DISTANCES[stroke].map((distance) => rowFor(gender, stroke, distance, ageIdx, grade))
}
