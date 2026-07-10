/**
 * デザインシステム用バレルエントリ（design-sync が --entry として使用）。
 * アプリ本体はこのファイルを import しない。
 * global.css の import で tokens.css を含む全スタイルがバンドルCSSに解決される。
 */
import '../styles/global.css'

export * from './BirthdateInput'
export * from './ChipSelector'
export * from './ConfirmDialog'
export * from './CrossTable'
export * from './GradeBadge'
export * from './GradeStepper'
export * from './LadderTable'
export * from './TabBar'
export * from './TimeInput'
export * from './Toast'

// デザインエージェント向けにコアロジックも公開（級判定・表示整形・実データ参照）
export { formatCs, partsToCs, csToParts, isValidParts } from 'swimrank-core'
export { strokeLabel, gradeLabel, eventLabel, ageGroupLabel } from 'swimrank-core'
export { swimAge, ageGroupIndex, isUnderage } from 'swimrank-core'
export { gradeFor, ladder } from 'swimrank-core'
export { crossStroke, crossDistance } from 'swimrank-core'
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
} from 'swimrank-core'
export type { LadderRow, GradeResult } from 'swimrank-core'
export type { CrossRow } from 'swimrank-core'
export type { EventData } from 'swimrank-core'
export type { Gender, Stroke, EventKey, RecordsMap } from 'swimrank-core'
