import { describe, expect, it } from 'vitest'
import { csToParts, formatCs, isValidParts, parseCsParam, partsToCs } from './time'

describe('formatCs', () => {
  it('4454 → "44.54"', () => {
    expect(formatCs(4454)).toBe('44.54')
  })

  it('9855 → "1:38.55"', () => {
    expect(formatCs(9855)).toBe('1:38.55')
  })

  it('0パディング: 1/100秒・分表示時の秒は2桁', () => {
    expect(formatCs(4408)).toBe('44.08')
    expect(formatCs(5)).toBe('0.05')
    expect(formatCs(6000)).toBe('1:00.00')
    expect(formatCs(6103)).toBe('1:01.03')
    expect(formatCs(60959)).toBe('10:09.59')
  })

  it('1時間 → "1:00:00.00"', () => {
    expect(formatCs(360000)).toBe('1:00:00.00')
    expect(formatCs(366103)).toBe('1:01:01.03')
  })

  it('0 → "0.00"', () => {
    expect(formatCs(0)).toBe('0.00')
  })
})

describe('partsToCs / csToParts（往復）', () => {
  it('partsToCs(0,44,54) = 4454', () => {
    expect(partsToCs(0, 44, 54)).toBe(4454)
  })

  it('partsToCs(1,38,55) = 9855', () => {
    expect(partsToCs(1, 38, 55)).toBe(9855)
  })

  it('csToParts(4454) / csToParts(9855)', () => {
    expect(csToParts(4454)).toEqual({ min: 0, sec: 44, cent: 54 })
    expect(csToParts(9855)).toEqual({ min: 1, sec: 38, cent: 55 })
  })

  it('往復で一致', () => {
    for (const cs of [0, 1, 99, 100, 4454, 9855, 5999, 6000, 599999]) {
      const { min, sec, cent } = csToParts(cs)
      expect(partsToCs(min, sec, cent)).toBe(cs)
    }
  })
})

describe('isValidParts', () => {
  it('秒61 は拒否', () => {
    expect(isValidParts(0, 61, 0)).toBe(false)
    expect(isValidParts(0, 60, 0)).toBe(false)
    expect(isValidParts(0, 59, 99)).toBe(true)
  })

  it('分0-99・1/100は0-99', () => {
    expect(isValidParts(99, 0, 0)).toBe(true)
    expect(isValidParts(100, 0, 0)).toBe(false)
    expect(isValidParts(0, 0, 99)).toBe(true)
    expect(isValidParts(0, 0, 100)).toBe(false)
  })

  it('負数・非整数は拒否', () => {
    expect(isValidParts(-1, 0, 0)).toBe(false)
    expect(isValidParts(0, -1, 0)).toBe(false)
    expect(isValidParts(0, 0, -1)).toBe(false)
    expect(isValidParts(0, 1.5, 0)).toBe(false)
  })
})

describe('parseCsParam', () => {
  it('正の整数のみ受理', () => {
    expect(parseCsParam('4454')).toBe(4454)
    expect(parseCsParam('1')).toBe(1)
  })

  it('null / 空 / 0 / 負 / 小数 / 非数 は null', () => {
    expect(parseCsParam(null)).toBeNull()
    expect(parseCsParam('')).toBeNull()
    expect(parseCsParam('0')).toBeNull()
    expect(parseCsParam('-5')).toBeNull()
    expect(parseCsParam('44.54')).toBeNull()
    expect(parseCsParam('abc')).toBeNull()
    expect(parseCsParam('12a')).toBeNull()
    expect(parseCsParam('1e3')).toBeNull()
  })
})
