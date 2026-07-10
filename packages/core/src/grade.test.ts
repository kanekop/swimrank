import { describe, expect, it } from 'vitest'
import type { EventData } from './data'
import { getEvent } from './data'
import { gradeFor, ladder } from './grade'

// men50Br 50-54(idx6) の実データ（センチ秒、grade 20→1）:
// [3332,3366,3400,3468,3536,3638,3740,3842,3944,4046,
//  4182,4318,4454,4590,4726,4896,5066,5236,5406,5576]
const men50Br = () => getEvent('M', 'Br', 50)!

describe('gradeFor: men50Br 50-54(idx6) 実データ', () => {
  it('20級基準ちょうど(33.32) → 20級、nextGrade/gapCs は null', () => {
    expect(gradeFor(men50Br(), 6, 3332)).toEqual({
      status: 'graded',
      grade: 20,
      nextGrade: null,
      gapCs: null,
    })
  })

  it('20級より速い(33.00) → 20級（最高位）', () => {
    const r = gradeFor(men50Br(), 6, 3300)
    expect(r.status).toBe('graded')
    if (r.status === 'graded') {
      expect(r.grade).toBe(20)
      expect(r.nextGrade).toBeNull()
    }
  })

  it('8級基準ちょうど(44.54) → 同着で8級獲得、次は9級(43.18)まで1.36秒', () => {
    expect(gradeFor(men50Br(), 6, 4454)).toEqual({
      status: 'graded',
      grade: 8,
      nextGrade: 9,
      gapCs: 4454 - 4318,
    })
  })

  it('8級基準を1cs超過(44.55) → 7級、次は8級まで0.01秒', () => {
    expect(gradeFor(men50Br(), 6, 4455)).toEqual({
      status: 'graded',
      grade: 7,
      nextGrade: 8,
      gapCs: 1,
    })
  })

  it('1級基準ちょうど(55.76) → 1級', () => {
    expect(gradeFor(men50Br(), 6, 5576)).toEqual({
      status: 'graded',
      grade: 1,
      nextGrade: 2,
      gapCs: 5576 - 5406,
    })
  })

  it('1級基準を1cs超過(55.77) → 級外、あと0.01秒で1級', () => {
    expect(gradeFor(men50Br(), 6, 5577)).toEqual({
      status: 'kyugai',
      firstGrade: 1,
      gapCs: 1,
    })
  })
})

describe('gradeFor: データなし列', () => {
  it('men200Bc 90-(idx14) は全null → no-data', () => {
    const ev = getEvent('M', 'Bc', 200)!
    expect(gradeFor(ev, 14, 10000)).toEqual({ status: 'no-data' })
    expect(gradeFor(ev, 14, 1)).toEqual({ status: 'no-data' })
  })
})

describe('gradeFor: 中間nullスキップ（合成イベント）', () => {
  // 実データの null は列単位（年齢区分ごと欠損）のみのため、
  // 中間null のスキャン挙動は合成データで検証する。
  // idx0: 20級=30.00, 19級=null, 18級=null, 17級=33.00, 16級=34.00, 以下null
  const synth: EventData = {
    id: 'synth50Fr',
    title: '合成テスト種目',
    gender: 'M',
    stroke: 'Fr',
    distance: 50,
    timesCs: Array.from({ length: 20 }, (_, row): (number | null)[] => {
      const col0: Record<number, number> = { 0: 3000, 3: 3300, 4: 3400 }
      return Array.from({ length: 15 }, (_, c) => (c === 0 ? (col0[row] ?? null) : null))
    }),
    estimatedSet: new Set(),
  }

  it('31.00 → 19/18級(null)を飛ばして17級、nextGradeはデータのある20級', () => {
    expect(gradeFor(synth, 0, 3100)).toEqual({
      status: 'graded',
      grade: 17,
      nextGrade: 20,
      gapCs: 3100 - 3000,
    })
  })

  it('全基準より遅い(35.00) → 級外、firstGradeはデータのある最下級16級', () => {
    expect(gradeFor(synth, 0, 3500)).toEqual({
      status: 'kyugai',
      firstGrade: 16,
      gapCs: 3500 - 3400,
    })
  })

  it('全null列(idx1) → no-data', () => {
    expect(gradeFor(synth, 1, 3000)).toEqual({ status: 'no-data' })
  })
})

describe('ladder', () => {
  it('men50Br idx6: 20行、20級→1級の順で実データ値', () => {
    const rows = ladder(men50Br(), 6)
    expect(rows.length).toBe(20)
    expect(rows[0]).toEqual({ grade: 20, timeCs: 3332, estimated: false })
    expect(rows[12]).toEqual({ grade: 8, timeCs: 4454, estimated: false })
    expect(rows[19]).toEqual({ grade: 1, timeCs: 5576, estimated: false })
  })

  it('women50Bc idx10: 推定値セルに estimated フラグ', () => {
    const ev = getEvent('F', 'Bc', 50)!
    const rows = ladder(ev, 10)
    expect(rows[15]).toEqual({ grade: 5, timeCs: 6480, estimated: false })
    expect(rows[16]).toEqual({ grade: 4, timeCs: 6705, estimated: true })
    expect(rows[17]).toEqual({ grade: 3, timeCs: 6930, estimated: true })
  })

  it('men200Bc idx14: 全行 timeCs null', () => {
    const ev = getEvent('M', 'Bc', 200)!
    const rows = ladder(ev, 14)
    expect(rows.length).toBe(20)
    for (const row of rows) expect(row.timeCs).toBeNull()
  })
})
