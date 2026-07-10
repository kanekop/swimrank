import { describe, expect, it } from 'vitest'
import { crossDistance, crossStroke } from './cross'

describe('crossStroke（同じ距離で泳法横断）', () => {
  it('距離400 男子 idx6 8級: Fr/IM は ok、Bc/Br/Bt は no-event', () => {
    const rows = crossStroke('M', 400, 6, 8)
    expect(rows.map((r) => r.stroke)).toEqual(['Fr', 'Bc', 'Br', 'Bt', 'IM'])
    expect(rows.map((r) => r.status)).toEqual(['ok', 'no-event', 'no-event', 'no-event', 'ok'])
    expect(rows[0].timeCs).toBe(37335) // men400Fr 8級 idx6 = 6:13.35
    expect(rows[4].timeCs).toBe(43885) // men400IM 8級 idx6 = 7:18.85
    expect(rows[1].timeCs).toBeNull()
    expect(rows[1].estimated).toBe(false)
  })

  it('距離25 男子 idx6 8級: IM のみ no-event', () => {
    const rows = crossStroke('M', 25, 6, 8)
    expect(rows.map((r) => r.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'no-event'])
    expect(rows[0].timeCs).toBe(1403) // men25Fr
    expect(rows[1].timeCs).toBe(1783) // men25Bc
  })

  it('全行の distance が入力距離', () => {
    for (const r of crossStroke('M', 400, 6, 8)) expect(r.distance).toBe(400)
  })
})

describe('crossDistance（同じ泳法で距離横断）', () => {
  it('男子背泳ぎ idx6 8級: 4行（25/50/100/200）全て ok', () => {
    const rows = crossDistance('M', 'Bc', 6, 8)
    expect(rows.length).toBe(4)
    expect(rows.map((r) => r.distance)).toEqual([25, 50, 100, 200])
    expect(rows.map((r) => r.status)).toEqual(['ok', 'ok', 'ok', 'ok'])
    expect(rows.map((r) => r.timeCs)).toEqual([1783, 4192, 9039, 19781])
  })

  it('男子バタフライ idx14(90-) 10級: 25 のみ ok、50/100/200 は no-data', () => {
    const rows = crossDistance('M', 'Bt', 14, 10)
    expect(rows.map((r) => r.status)).toEqual(['ok', 'no-data', 'no-data', 'no-data'])
    expect(rows[0].timeCs).toBe(4285) // men25Bt 10級 idx14
    expect(rows[1].timeCs).toBeNull()
  })

  it('女子個メ idx2 13級: 400 は推定値フラグ付き', () => {
    const rows = crossDistance('F', 'IM', 2, 13)
    expect(rows.map((r) => r.distance)).toEqual([100, 200, 400])
    expect(rows.map((r) => r.status)).toEqual(['ok', 'ok', 'ok'])
    expect(rows[2].timeCs).toBe(36160) // women400IM 13級 idx2（修復セル）
    expect(rows[2].estimated).toBe(true)
    expect(rows[0].estimated).toBe(false)
    expect(rows[1].estimated).toBe(false)
  })
})
