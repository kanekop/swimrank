/**
 * デザインシステム用バレルエントリ（design-sync が --entry として使用）。
 * アプリ本体はこのファイルを import しない。
 * global.css の import で tokens.css を含む全スタイルがバンドルCSSに解決される。
 */
import '../styles/global.css'

export * from './ChipSelector'
export * from './CrossTable'
export * from './GradeBadge'
export * from './GradeStepper'
export * from './LadderTable'
export * from './TabBar'
export * from './TimeInput'
export * from './Toast'

// デザインエージェント向けにコアロジックも公開（級判定・表示整形・実データ参照）
export { formatCs, partsToCs, csToParts, isValidParts } from '../core/time'
export { strokeLabel, gradeLabel, eventLabel, ageGroupLabel } from '../core/labels'
export { swimAge, ageGroupIndex, isUnderage } from '../core/age'
export { gradeFor, ladder } from '../core/grade'
export { crossStroke, crossDistance } from '../core/cross'
export {
  getEvent,
  getEventByKey,
  eventKey,
  parseEventKey,
  standardCs,
  isEstimated,
  AGE_GROUPS,
  GRADES,
  STROKES,
  DISTANCES,
  dataMeta,
} from '../core/data'
export type { LadderRow, GradeResult } from '../core/grade'
export type { CrossRow } from '../core/cross'
export type { EventData } from '../core/data'
export type { Gender, Stroke, EventKey, RecordsMap } from '../core/types'
