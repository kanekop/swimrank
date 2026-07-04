import type { EventData } from './data'
import { GRADES, isEstimated, standardCs } from './data'

export type GradeResult =
  | {
      status: 'graded'
      grade: number
      /** データのある次の上位級。grade 20（または上位に基準がない場合）は null */
      nextGrade: number | null
      /** 上位級基準までの差（timeCs - 上位級基準）。nextGrade が null なら null */
      gapCs: number | null
    }
  | {
      status: 'kyugai'
      /** データのある最下級（通常 1級） */
      firstGrade: number | null
      /** 最下級基準までの差（timeCs - 最下級基準） */
      gapCs: number | null
    }
  | { status: 'no-data' }

/**
 * 級判定。20→1 へスキャンし null はスキップ、
 * 最初に timeCs <= 基準 となった級を獲得（同着は級獲得）。
 * どの基準にも届かなければ級外、列が全 null なら no-data。
 */
export function gradeFor(ev: EventData, ageIdx: number, timeCs: number): GradeResult {
  let prevGrade: number | null = null
  let prevStd: number | null = null
  for (const grade of GRADES) {
    const std = standardCs(ev, grade, ageIdx)
    if (std === null) continue
    if (timeCs <= std) {
      return {
        status: 'graded',
        grade,
        nextGrade: prevGrade,
        gapCs: prevStd === null ? null : timeCs - prevStd,
      }
    }
    prevGrade = grade
    prevStd = std
  }
  if (prevGrade === null || prevStd === null) return { status: 'no-data' }
  return { status: 'kyugai', firstGrade: prevGrade, gapCs: timeCs - prevStd }
}

export interface LadderRow {
  grade: number
  timeCs: number | null
  estimated: boolean
}

/** 級一覧ラダー（20級→1級の20行。データなしセルは timeCs: null） */
export function ladder(ev: EventData, ageIdx: number): LadderRow[] {
  return GRADES.map((grade) => ({
    grade,
    timeCs: standardCs(ev, grade, ageIdx),
    estimated: isEstimated(ev, grade, ageIdx),
  }))
}
