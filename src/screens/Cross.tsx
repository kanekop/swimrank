/**
 * 横断ビュー #/cross?grade=8&stroke=Br&distance=50
 * 級ステッパー + 基準種目セレクタ + 2テーブル（泳法横断/距離横断）。
 * URL が真実の源: 操作は replace ナビゲーションで反映する。
 * タブバーから直接開いた場合のデフォルト: grade=10, lastEvent の泳法/距離。
 */

import { navigate } from '../app/router'
import { ageGroupIndex, isUnderage, swimAge } from '../core/age'
import { crossDistance, crossStroke } from '../core/cross'
import { DISTANCES, STROKES, eventKey } from '../core/data'
import { ageGroupLabel, gradeLabel, strokeLabel } from '../core/labels'
import type { Profile, RecordsMap, Stroke } from '../core/types'
import type { LastEvent } from '../hooks/useLastEvent'
import { CrossTable } from '../components/CrossTable'
import { GradeStepper } from '../components/GradeStepper'
import styles from './Cross.module.css'

/** 泳法に存在する距離へ丸める（50m優先、なければ先頭） */
function clampDistance(stroke: Stroke, distance: number): number {
  if (DISTANCES[stroke].includes(distance)) return distance
  return DISTANCES[stroke].includes(50) ? 50 : DISTANCES[stroke][0]
}

export interface CrossProps {
  profile: Profile
  records: RecordsMap
  grade: number | null
  stroke: Stroke | null
  distance: number | null
  lastEvent: LastEvent | null
}

export function Cross({ profile, records, grade, stroke, distance, lastEvent }: CrossProps) {
  const age = swimAge(profile.birthdate, new Date())
  const ageIdx = ageGroupIndex(age)

  const baseGrade = grade ?? 10
  const baseStroke: Stroke = stroke ?? lastEvent?.stroke ?? 'Fr'
  const baseDistance = clampDistance(baseStroke, distance ?? lastEvent?.distance ?? 50)
  const genderText = profile.gender === 'M' ? '男子' : '女子'

  function go(g: number, s: Stroke, d: number) {
    navigate({ name: 'cross', grade: g, stroke: s, distance: d }, { replace: true })
  }

  const strokeRows = crossStroke(profile.gender, baseDistance, ageIdx, baseGrade)
  const distanceRows = crossDistance(profile.gender, baseStroke, ageIdx, baseGrade)
  const allRows = [...strokeRows, ...distanceRows]
  const anyEstimated = allRows.some((r) => r.estimated)
  const anyRecordNote = allRows.some(
    (r) => r.status === 'ok' && records[eventKey(r.stroke, r.distance)] !== undefined,
  )

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>級表</h1>
        <p className={styles.meta}>
          {ageGroupLabel(ageIdx)} ・ {genderText}
        </p>
        {isUnderage(age) && (
          <p className={styles.note}>マスターズ登録は18歳から。18-24区分の基準で表示しています</p>
        )}
      </header>

      <div className={styles.controls}>
        <GradeStepper grade={baseGrade} onChange={(g) => go(g, baseStroke, baseDistance)} />
        <div className={styles.selects}>
          <select
            className={styles.select}
            aria-label="泳法"
            value={baseStroke}
            onChange={(e) => {
              const s = e.target.value as Stroke
              go(baseGrade, s, clampDistance(s, baseDistance))
            }}
          >
            {STROKES.map((s) => (
              <option key={s} value={s}>
                {strokeLabel[s]}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label="距離"
            value={baseDistance}
            onChange={(e) => go(baseGrade, baseStroke, Number(e.target.value))}
          >
            {DISTANCES[baseStroke].map((d) => (
              <option key={d} value={d}>
                {d}m
              </option>
            ))}
          </select>
        </div>
      </div>

      <CrossTable
        title={`同じ距離で比べる（${baseDistance}m・${gradeLabel(baseGrade)}）`}
        variant="stroke"
        rows={strokeRows}
        baseStroke={baseStroke}
        baseDistance={baseDistance}
        gender={profile.gender}
        ageIdx={ageIdx}
        records={records}
      />

      <CrossTable
        title={`同じ泳法で比べる（${strokeLabel[baseStroke]}・${gradeLabel(baseGrade)}）`}
        variant="distance"
        rows={distanceRows}
        baseStroke={baseStroke}
        baseDistance={baseDistance}
        gender={profile.gender}
        ageIdx={ageIdx}
        records={records}
      />

      {(anyEstimated || anyRecordNote) && (
        <div className={styles.footnotes}>
          {anyEstimated && <p className={styles.footnote}>* 推定値（元データ補修）</p>}
          {anyRecordNote && <p className={styles.footnote}>✓ 保存記録 → その記録の級</p>}
        </div>
      )}
    </div>
  )
}
