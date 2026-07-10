import { describe, expect, it } from 'vitest'
import { ageGroupLabel, eventLabel, gradeLabel, strokeLabel } from './labels'

describe('labels', () => {
  it('strokeLabel', () => {
    expect(strokeLabel.Fr).toBe('自由形')
    expect(strokeLabel.Bc).toBe('背泳ぎ')
    expect(strokeLabel.Br).toBe('平泳ぎ')
    expect(strokeLabel.Bt).toBe('バタフライ')
    expect(strokeLabel.IM).toBe('個人メドレー')
  })

  it('gradeLabel', () => {
    expect(gradeLabel(8)).toBe('8級')
    expect(gradeLabel(20)).toBe('20級')
  })

  it('eventLabel', () => {
    expect(eventLabel('Br', 50)).toBe('50m平泳ぎ')
    expect(eventLabel('Fr', 1500)).toBe('1500m自由形')
    expect(eventLabel('IM', 400)).toBe('400m個人メドレー')
  })

  it('ageGroupLabel', () => {
    expect(ageGroupLabel(6)).toBe('50-54')
    expect(ageGroupLabel(0)).toBe('18-24')
    expect(ageGroupLabel(14)).toBe('90-')
    expect(ageGroupLabel(99)).toBe('')
  })
})
