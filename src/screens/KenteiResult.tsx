/**
 * 判定結果 #/kentei/result?e=50Br&t=4454
 * - 大きな級バッジ + タイム + 「あと X.XX秒 で 上位級」
 * - 級外/20級（最高位）/no-data のエッジケース表示
 * - 級一覧ラダー（自分の行ハイライト + 自動スクロール）
 * - [マイ記録に保存]（遅いタイムは上書き確認）/ [この級を横断で見る]
 * - t パラメータなし → ラダーのみ表示モード（横断ビューの行タップから）
 */

import { useState } from 'react'
import type { ReactElement } from 'react'
import { buildHash } from '../app/router'
import { ageGroupIndex, isUnderage, swimAge } from '../core/age'
import { getEventByKey, isEstimated, parseEventKey, standardCs } from '../core/data'
import { gradeFor, ladder } from '../core/grade'
import { ageGroupLabel, eventLabel, gradeLabel } from '../core/labels'
import { formatCs } from '../core/time'
import type { EventKey, Profile, RecordEntry, RecordsMap } from '../core/types'
import { GradeBadge } from '../components/GradeBadge'
import { LadderTable } from '../components/LadderTable'
import { Toast } from '../components/Toast'
import styles from './KenteiResult.module.css'

/** ギャップ秒表示。46 → "0.46" */
function gapSec(gapCs: number): string {
  return (gapCs / 100).toFixed(2)
}

export interface KenteiResultProps {
  profile: Profile
  eventKey: EventKey | null
  /** null = ラダーのみ表示モード */
  timeCs: number | null
  records: RecordsMap
  saveRecord: (key: EventKey, entry: RecordEntry) => boolean
}

export function KenteiResult({ profile, eventKey: eventKeyProp, timeCs, records, saveRecord }: KenteiResultProps) {
  const [toast, setToast] = useState<string | null>(null)

  const parsed = eventKeyProp === null ? null : parseEventKey(eventKeyProp)
  const ev = eventKeyProp === null ? null : getEventByKey(profile.gender, eventKeyProp)

  if (eventKeyProp === null || parsed === null || ev === null) {
    return (
      <div className={styles.screen}>
        <p className={styles.error}>種目が見つかりませんでした。</p>
        <a className="btn-primary" href="#/kentei">
          判定画面へ
        </a>
      </div>
    )
  }

  const key = eventKeyProp
  const age = swimAge(profile.birthdate, new Date())
  const ageIdx = ageGroupIndex(age)
  const result = timeCs === null ? null : gradeFor(ev, ageIdx, timeCs)
  const ladderRows = ladder(ev, ageIdx)
  const genderText = profile.gender === 'M' ? '男子' : '女子'

  // ヒーロー部（t あり時のみ）
  let hero: ReactElement | null = null
  if (timeCs !== null && result !== null) {
    if (result.status === 'graded') {
      let gapLine: ReactElement | null = null
      if (result.nextGrade !== null && result.gapCs !== null) {
        const nextStd = standardCs(ev, result.nextGrade, ageIdx)
        if (nextStd !== null) {
          gapLine = (
            <p className={styles.gap}>
              あと <strong>{gapSec(result.gapCs)}秒</strong> で {gradeLabel(result.nextGrade)}（
              {formatCs(nextStd)}
              {isEstimated(ev, result.nextGrade, ageIdx) ? '*' : ''}）
            </p>
          )
        }
      }
      let topLine: ReactElement | null = null
      if (result.grade === 20) {
        const std20 = standardCs(ev, 20, ageIdx)
        const diff = std20 === null ? null : std20 - timeCs
        topLine = (
          <>
            <p className={styles.top}>20級（最高位）</p>
            {diff !== null && diff > 0 && (
              <p className={styles.gap}>20級基準より {gapSec(diff)}秒 速い！</p>
            )}
          </>
        )
      }
      hero = (
        <section className={styles.hero}>
          <GradeBadge grade={result.grade} size="hero" />
          <p className={styles.time}>{formatCs(timeCs)}</p>
          {topLine}
          {gapLine}
        </section>
      )
    } else if (result.status === 'kyugai') {
      let gapLine: ReactElement | null = null
      if (result.firstGrade !== null && result.gapCs !== null) {
        const firstStd = standardCs(ev, result.firstGrade, ageIdx)
        gapLine = (
          <p className={styles.gap}>
            あと <strong>{gapSec(result.gapCs)}秒</strong> で {gradeLabel(result.firstGrade)}
            {firstStd !== null && (
              <>
                （{formatCs(firstStd)}
                {isEstimated(ev, result.firstGrade, ageIdx) ? '*' : ''}）
              </>
            )}
          </p>
        )
      }
      hero = (
        <section className={styles.hero}>
          <GradeBadge grade={null} size="hero" />
          <p className={styles.time}>{formatCs(timeCs)}</p>
          {gapLine}
        </section>
      )
    } else {
      hero = (
        <section className={styles.hero}>
          <p className={styles.time}>{formatCs(timeCs)}</p>
          <p className={styles.noData}>この年齢区分の基準データがありません</p>
        </section>
      )
    }
  }

  function handleSave() {
    if (timeCs === null) return
    const existing = records[key]
    if (existing && existing.timeCs < timeCs) {
      const ok = window.confirm(
        `保存済みの ${formatCs(existing.timeCs)} より遅いタイムです。上書きしますか？`,
      )
      if (!ok) return
    }
    const saved = saveRecord(key, { timeCs, date: new Date().toISOString().slice(0, 10) })
    setToast(saved ? 'マイ記録に保存しました' : 'この端末には保存できませんでした')
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={() => window.history.back()}
          aria-label="戻る"
        >
          ←
        </button>
        <h1 className={styles.headTitle}>
          {eventLabel(parsed.stroke, parsed.distance)} ・ {ageGroupLabel(ageIdx)} ・ {genderText}
        </h1>
      </header>

      {isUnderage(age) && (
        <p className={styles.note}>マスターズ登録は18歳から。18-24区分の基準で表示しています</p>
      )}

      {hero}

      {timeCs !== null && (
        <div className={styles.actions}>
          <button type="button" className="btn-primary" onClick={handleSave}>
            マイ記録に保存
          </button>
          {result !== null && result.status === 'graded' && (
            <a
              className="btn-secondary"
              href={buildHash({
                name: 'cross',
                grade: result.grade,
                stroke: parsed.stroke,
                distance: parsed.distance,
              })}
            >
              この級を横断で見る →
            </a>
          )}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>級一覧（{ageGroupLabel(ageIdx)}）</h2>
        <LadderTable
          rows={ladderRows}
          highlightGrade={result !== null && result.status === 'graded' ? result.grade : null}
          highlightKyugai={result !== null && result.status === 'kyugai'}
        />
      </section>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
