/**
 * swimrank-core 公開API。
 * マスターズ水泳の年齢別資格級（20級=最速〜1級）の判定・比較ロジックと
 * 基準タイムデータ（修復済み・推定値フラグ付き）を提供する。
 * 全タイムは整数センチ秒（timeCs）。年齢は水泳年齢（その年の12/31時点）。
 */

export type {
  Gender,
  Stroke,
  EventKey,
  EventId,
  Profile,
  RecordEntry,
  RecordsMap,
} from './types'

export {
  AGE_GROUPS,
  GRADES,
  STROKES,
  DISTANCES,
  EVENTS,
  dataMeta,
  eventKey,
  parseEventKey,
  getEvent,
  getEventByKey,
  standardCs,
  isEstimated,
} from './data'
export type { EventData } from './data'

export { swimAge, ageGroupIndex, isUnderage } from './age'

export { gradeFor, ladder } from './grade'
export type { GradeResult, LadderRow } from './grade'

export { crossStroke, crossDistance } from './cross'
export type { CrossRow } from './cross'

export { formatCs, partsToCs, csToParts, isValidParts, parseCsParam } from './time'

export { strokeLabel, gradeLabel, eventLabel, ageGroupLabel } from './labels'
