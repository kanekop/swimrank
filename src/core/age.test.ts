import { describe, expect, it } from 'vitest'
import { ageGroupIndex, isUnderage, swimAge } from './age'

describe('swimAge', () => {
  it('1973-05-02 @2026-07-04 → 53歳（年の差、誕生日は無視）', () => {
    expect(swimAge('1973-05-02', new Date('2026-07-04'))).toBe(53)
  })

  it('誕生日前でも年の差（1973-12-31 @2026-01-01 → 53歳）', () => {
    expect(swimAge('1973-12-31', new Date('2026-01-01'))).toBe(53)
  })
})

describe('ageGroupIndex', () => {
  it('53歳 → idx6 (50-54)', () => {
    expect(ageGroupIndex(53)).toBe(6)
  })

  it('境界 24/25', () => {
    expect(ageGroupIndex(24)).toBe(0)
    expect(ageGroupIndex(25)).toBe(1)
    expect(ageGroupIndex(29)).toBe(1)
    expect(ageGroupIndex(30)).toBe(2)
  })

  it('境界 89/90', () => {
    expect(ageGroupIndex(89)).toBe(13)
    expect(ageGroupIndex(90)).toBe(14)
    expect(ageGroupIndex(105)).toBe(14)
  })

  it('17歳 → idx0（18-24区分にクランプ）', () => {
    expect(ageGroupIndex(17)).toBe(0)
    expect(ageGroupIndex(10)).toBe(0)
    expect(ageGroupIndex(18)).toBe(0)
  })
})

describe('isUnderage', () => {
  it('17歳は未成年、18歳は成年', () => {
    expect(isUnderage(17)).toBe(true)
    expect(isUnderage(18)).toBe(false)
    expect(isUnderage(53)).toBe(false)
  })
})
