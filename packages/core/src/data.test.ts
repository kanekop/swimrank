import { describe, expect, it } from 'vitest'
import {
  AGE_GROUPS,
  DISTANCES,
  EVENTS,
  GRADES,
  STROKES,
  dataMeta,
  eventKey,
  getEvent,
  getEventByKey,
  isEstimated,
  parseEventKey,
  standardCs,
} from './data'

describe('data: 形状検証', () => {
  it('44種目ある', () => {
    expect(EVENTS.length).toBe(44)
  })

  it('全種目が20級×15列のマトリクス', () => {
    for (const ev of EVENTS) {
      expect(ev.timesCs.length, ev.id).toBe(20)
      for (const row of ev.timesCs) {
        expect(row.length, ev.id).toBe(15)
      }
    }
  })

  it('全セルが整数センチ秒または null', () => {
    for (const ev of EVENTS) {
      for (const row of ev.timesCs) {
        for (const v of row) {
          if (v !== null) {
            expect(Number.isInteger(v), `${ev.id}: ${v}`).toBe(true)
            expect(v).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('AGE_GROUPS は15区分', () => {
    expect(AGE_GROUPS.length).toBe(15)
    expect(AGE_GROUPS[0]).toBe('18-24')
    expect(AGE_GROUPS[6]).toBe('50-54')
    expect(AGE_GROUPS[14]).toBe('90-')
  })

  it('GRADES は 20→1', () => {
    expect(GRADES.length).toBe(20)
    expect(GRADES[0]).toBe(20)
    expect(GRADES[19]).toBe(1)
    for (let i = 0; i < 20; i++) expect(GRADES[i]).toBe(20 - i)
  })

  it('STROKES は固定順、DISTANCES は設計どおり', () => {
    expect(STROKES).toEqual(['Fr', 'Bc', 'Br', 'Bt', 'IM'])
    expect(DISTANCES.Fr).toEqual([25, 50, 100, 200, 400, 800, 1500])
    expect(DISTANCES.Bc).toEqual([25, 50, 100, 200])
    expect(DISTANCES.Br).toEqual([25, 50, 100, 200])
    expect(DISTANCES.Bt).toEqual([25, 50, 100, 200])
    expect(DISTANCES.IM).toEqual([100, 200, 400])
  })

  it('DISTANCES と実データの種目集合が一致（性別×22種目）', () => {
    for (const gender of ['M', 'F'] as const) {
      let count = 0
      for (const stroke of STROKES) {
        for (const distance of DISTANCES[stroke]) {
          const ev = getEvent(gender, stroke, distance)
          expect(ev, `${gender} ${distance}${stroke}`).not.toBeNull()
          count++
        }
      }
      expect(count).toBe(22)
    }
  })
})

describe('data: 修復後の列単調性（全数チェック）', () => {
  it('全種目・全列で級降順（20→1）にタイムが厳密増加（null飛ばし）', () => {
    for (const ev of EVENTS) {
      for (let col = 0; col < 15; col++) {
        let prev: number | null = null
        for (let row = 0; row < 20; row++) {
          const v = ev.timesCs[row][col]
          if (v === null) continue
          if (prev !== null) {
            expect(v, `${ev.id} col=${col}(${AGE_GROUPS[col]}) grade=${20 - row}`).toBeGreaterThan(
              prev,
            )
          }
          prev = v
        }
      }
    }
  })
})

describe('data: lookup / キー', () => {
  it('getEvent が正しい種目を返す', () => {
    expect(getEvent('M', 'Br', 50)?.id).toBe('men50Br')
    expect(getEvent('F', 'Fr', 1500)?.id).toBe('women1500Fr')
    expect(getEvent('F', 'Bc', 50)?.id).toBe('women50Bc')
  })

  it('存在しない組合せは null（400m背泳ぎ等）', () => {
    expect(getEvent('M', 'Bc', 400)).toBeNull()
    expect(getEvent('M', 'IM', 25)).toBeNull()
    expect(getEvent('F', 'Br', 800)).toBeNull()
  })

  it('eventKey / parseEventKey', () => {
    expect(eventKey('Br', 50)).toBe('50Br')
    expect(eventKey('Fr', 1500)).toBe('1500Fr')
    expect(parseEventKey('50Br')).toEqual({ stroke: 'Br', distance: 50 })
    expect(parseEventKey('1500Fr')).toEqual({ stroke: 'Fr', distance: 1500 })
    expect(parseEventKey('Br50')).toBeNull()
    expect(parseEventKey('50')).toBeNull()
    expect(parseEventKey('Fr')).toBeNull()
    expect(parseEventKey('')).toBeNull()
    expect(parseEventKey('50Xx')).toBeNull()
  })

  it('getEventByKey', () => {
    expect(getEventByKey('M', '50Br')?.id).toBe('men50Br')
    expect(getEventByKey('F', '50Br')?.id).toBe('women50Br')
    expect(getEventByKey('M', 'bogus')).toBeNull()
    expect(getEventByKey('M', '400Bc')).toBeNull()
  })
})

describe('data: standardCs / isEstimated（実データ固定値）', () => {
  it('men50Br 50-54(idx6): 20級=33.32, 8級=44.54, 1級=55.76', () => {
    const ev = getEvent('M', 'Br', 50)!
    expect(standardCs(ev, 20, 6)).toBe(3332)
    expect(standardCs(ev, 8, 6)).toBe(4454)
    expect(standardCs(ev, 1, 6)).toBe(5576)
  })

  it('men200Bc 90-(idx14) はデータなし → null', () => {
    const ev = getEvent('M', 'Bc', 200)!
    expect(standardCs(ev, 8, 14)).toBeNull()
    expect(standardCs(ev, 20, 14)).toBeNull()
  })

  it('範囲外の grade / ageIdx は null', () => {
    const ev = getEvent('M', 'Br', 50)!
    expect(standardCs(ev, 21, 6)).toBeNull()
    expect(standardCs(ev, 0, 6)).toBeNull()
    expect(standardCs(ev, 8, 15)).toBeNull()
    expect(standardCs(ev, 8, -1)).toBeNull()
  })

  it('推定値フラグ: men50Fr 20級 25-29(idx1)=修復済み 22.29', () => {
    const ev = getEvent('M', 'Fr', 50)!
    expect(standardCs(ev, 20, 1)).toBe(2229)
    expect(isEstimated(ev, 20, 1)).toBe(true)
    expect(isEstimated(ev, 20, 0)).toBe(false)
  })

  it('推定値フラグ: women50Bc 70-74(idx10) の4級・3級', () => {
    const ev = getEvent('F', 'Bc', 50)!
    expect(isEstimated(ev, 4, 10)).toBe(true)
    expect(isEstimated(ev, 3, 10)).toBe(true)
    expect(isEstimated(ev, 5, 10)).toBe(false)
    expect(standardCs(ev, 4, 10)).toBe(6705)
  })

  it('dataMeta', () => {
    expect(dataMeta.sourceName).toBe('マスターズ水泳年齢別資格表')
    expect(dataMeta.source).toContain('zavastsurumi')
    expect(dataMeta.fetchedAt).toBeTruthy()
  })
})
