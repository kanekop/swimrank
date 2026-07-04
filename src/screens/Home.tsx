/**
 * ホーム #/
 * 挨拶 + 水泳年齢/区分、マイ記録一覧（級の高い順）、判定への導線。
 * 記録行タップで保存タイムを再判定（#/kentei/result?e=..&t=..）。
 */

import { buildHash } from '../app/router'
import { ageGroupIndex, isUnderage, swimAge } from '../core/age'
import { STROKES, getEventByKey, parseEventKey } from '../core/data'
import { gradeFor, type GradeResult } from '../core/grade'
import { ageGroupLabel, eventLabel } from '../core/labels'
import { formatCs } from '../core/time'
import type { Profile, RecordEntry, RecordsMap, Stroke } from '../core/types'
import { GradeBadge } from '../components/GradeBadge'
import styles from './Home.module.css'

interface RecordRow {
  key: string
  stroke: Stroke
  distance: number
  entry: RecordEntry
  result: GradeResult
}

/** 並べ替え用ランク。graded は級そのもの、級外 0、データなし -1 */
function rankOf(r: GradeResult): number {
  if (r.status === 'graded') return r.grade
  if (r.status === 'kyugai') return 0
  return -1
}

export interface HomeProps {
  profile: Profile
  records: RecordsMap
}

export function Home({ profile, records }: HomeProps) {
  const age = swimAge(profile.birthdate, new Date())
  const ageIdx = ageGroupIndex(age)

  const rows: RecordRow[] = []
  for (const [key, entry] of Object.entries(records)) {
    if (!entry) continue
    const parsed = parseEventKey(key)
    if (!parsed) continue
    const ev = getEventByKey(profile.gender, key)
    if (!ev) continue
    rows.push({
      key,
      stroke: parsed.stroke,
      distance: parsed.distance,
      entry,
      result: gradeFor(ev, ageIdx, entry.timeCs),
    })
  }
  rows.sort((a, b) => {
    const byRank = rankOf(b.result) - rankOf(a.result)
    if (byRank !== 0) return byRank
    const byStroke = STROKES.indexOf(a.stroke) - STROKES.indexOf(b.stroke)
    if (byStroke !== 0) return byStroke
    return a.distance - b.distance
  })

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>{profile.name}さん、おかえりなさい 🏊</h1>
        <p className={styles.sub}>
          水泳年齢 {age}歳 ・ {ageGroupLabel(ageIdx)}区分
        </p>
        {isUnderage(age) && (
          <p className={styles.note}>マスターズ登録は18歳から。18-24区分の基準で表示しています</p>
        )}
      </header>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            まだ記録がありません。
            <br />
            まずはタイムを判定してみましょう
          </p>
          <a className="btn-primary" href="#/kentei">
            ＋ タイムを判定して記録を追加
          </a>
        </div>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>マイ記録</h2>
          <ul className={styles.list}>
            {rows.map((row) => (
              <li key={row.key}>
                <a
                  className={styles.row}
                  href={buildHash({ name: 'kentei-result', eventKey: row.key, timeCs: row.entry.timeCs })}
                >
                  {row.result.status === 'no-data' ? (
                    <span className={styles.dash}>―</span>
                  ) : (
                    <GradeBadge grade={row.result.status === 'graded' ? row.result.grade : null} />
                  )}
                  <span className={styles.event}>{eventLabel(row.stroke, row.distance)}</span>
                  <span className={styles.time}>{formatCs(row.entry.timeCs)}</span>
                </a>
              </li>
            ))}
          </ul>
          <a className="btn-secondary" href="#/kentei">
            ＋ タイムを判定して記録を追加
          </a>
        </section>
      )}
    </div>
  )
}
