/**
 * 整数センチ秒 → 表示文字列
 * 4454 → "44.54"、9855 → "1:38.55"、360000 → "1:00:00.00"
 */
export function formatCs(cs: number): string {
  const cent = cs % 100
  const totalSec = Math.floor(cs / 100)
  const sec = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const cc = String(cent).padStart(2, '0')
  if (totalMin === 0) return `${sec}.${cc}`
  const ss = String(sec).padStart(2, '0')
  const min = totalMin % 60
  const hours = Math.floor(totalMin / 60)
  if (hours === 0) return `${totalMin}:${ss}.${cc}`
  return `${hours}:${String(min).padStart(2, '0')}:${ss}.${cc}`
}

/** 分・秒・1/100秒 → 整数センチ秒 */
export function partsToCs(min: number, sec: number, cent: number): number {
  return min * 6000 + sec * 100 + cent
}

/** 整数センチ秒 → 分・秒・1/100秒 */
export function csToParts(cs: number): { min: number; sec: number; cent: number } {
  return {
    min: Math.floor(cs / 6000),
    sec: Math.floor(cs / 100) % 60,
    cent: cs % 100,
  }
}

/** TimeInput 検証: 分0-99、秒0-59、1/100は0-99（整数のみ） */
export function isValidParts(min: number, sec: number, cent: number): boolean {
  if (!Number.isInteger(min) || !Number.isInteger(sec) || !Number.isInteger(cent)) return false
  return min >= 0 && min <= 99 && sec >= 0 && sec <= 59 && cent >= 0 && cent <= 99
}

/** URLパラメータ検証（正の整数のみ受理。それ以外は null） */
export function parseCsParam(s: string | null): number | null {
  if (s === null) return null
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}
