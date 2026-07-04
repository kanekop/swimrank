import type { EventId, EventKey, Gender, Stroke } from './types'
import raw from '../data/sikaku.json'

/** sikaku.json のイベント生データ（マトリクス形式） */
interface RawEvent {
  id: EventId
  title: string
  gender: Gender
  stroke: Stroke
  distance: number
  /** times[20 - grade][ageIdx] 秒（float）。null = データなし */
  times: (number | null)[][]
  /** 推定値セル [grade, ageIdx] のリスト */
  estimated?: [number, number][]
}

interface RawData {
  schemaVersion: number
  source: string
  sourceName: string
  fetchedAt: string
  ageGroups: string[]
  grades: number[]
  events: RawEvent[]
}

const data = raw as unknown as RawData

/** 読込・変換済みの種目データ。タイムは整数センチ秒 */
export interface EventData {
  id: EventId
  title: string
  gender: Gender
  stroke: Stroke
  distance: number
  /** timesCs[20 - grade][ageIdx] 整数センチ秒。null = データなし */
  timesCs: (number | null)[][]
  /** 推定値セル "grade:ageIdx" の集合 */
  estimatedSet: Set<string>
}

/** 年齢区分ラベル 15列（"18-24" .. "90-"） */
export const AGE_GROUPS: string[] = data.ageGroups

/** 級リスト 20→1 の順 */
export const GRADES: number[] = data.grades

/** 泳法の固定表示順 */
export const STROKES: Stroke[] = ['Fr', 'Bc', 'Br', 'Bt', 'IM']

/** 泳法ごとの存在する距離 */
export const DISTANCES: Record<Stroke, number[]> = {
  Fr: [25, 50, 100, 200, 400, 800, 1500],
  Bc: [25, 50, 100, 200],
  Br: [25, 50, 100, 200],
  Bt: [25, 50, 100, 200],
  IM: [100, 200, 400],
}

export const dataMeta: { source: string; sourceName: string; fetchedAt: string } = {
  source: data.source,
  sourceName: data.sourceName,
  fetchedAt: data.fetchedAt,
}

function estimatedKey(grade: number, ageIdx: number): string {
  return `${grade}:${ageIdx}`
}

/** 全種目（float秒 → 整数センチ秒へ変換済み） */
export const EVENTS: EventData[] = data.events.map((e) => ({
  id: e.id,
  title: e.title,
  gender: e.gender,
  stroke: e.stroke,
  distance: e.distance,
  timesCs: e.times.map((row) => row.map((v) => (v === null ? null : Math.round(v * 100)))),
  estimatedSet: new Set((e.estimated ?? []).map(([g, a]) => estimatedKey(g, a))),
}))

const eventIndex = new Map<string, EventData>()
for (const ev of EVENTS) {
  eventIndex.set(`${ev.gender}:${eventKey(ev.stroke, ev.distance)}`, ev)
}

/** 性別中立の種目キーを生成。例: eventKey('Br', 50) → "50Br" */
export function eventKey(stroke: Stroke, distance: number): EventKey {
  return `${distance}${stroke}`
}

/** 種目キーを分解。不正な形式は null */
export function parseEventKey(key: EventKey): { stroke: Stroke; distance: number } | null {
  const m = /^(\d+)(Fr|Bc|Br|Bt|IM)$/.exec(key)
  if (!m) return null
  return { stroke: m[2] as Stroke, distance: Number(m[1]) }
}

/** 種目データ取得。存在しない組合せは null */
export function getEvent(gender: Gender, stroke: Stroke, distance: number): EventData | null {
  return eventIndex.get(`${gender}:${eventKey(stroke, distance)}`) ?? null
}

/** 種目キーから種目データ取得。不正キー・存在しない組合せは null */
export function getEventByKey(gender: Gender, key: EventKey): EventData | null {
  const parsed = parseEventKey(key)
  if (!parsed) return null
  return getEvent(gender, parsed.stroke, parsed.distance)
}

/** 基準タイム（整数センチ秒）。範囲外・データなしは null */
export function standardCs(ev: EventData, grade: number, ageIdx: number): number | null {
  const row = 20 - grade
  if (row < 0 || row >= ev.timesCs.length) return null
  if (ageIdx < 0 || ageIdx >= AGE_GROUPS.length) return null
  return ev.timesCs[row][ageIdx]
}

/** そのセルが推定値（元データ補修）かどうか */
export function isEstimated(ev: EventData, grade: number, ageIdx: number): boolean {
  return ev.estimatedSet.has(estimatedKey(grade, ageIdx))
}
