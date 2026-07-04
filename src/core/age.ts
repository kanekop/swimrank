/**
 * 水泳年齢（マスターズは「その年の12月31日時点の年齢」= 年の差）
 * birthdate は ISO形式 "1973-05-02"
 */
export function swimAge(birthdate: string, now: Date): number {
  const birthYear = Number(birthdate.slice(0, 4))
  return now.getFullYear() - birthYear
}

/**
 * 年齢 → 年齢区分インデックス（AGE_GROUPS の添字）
 * <25 → 0 (18-24), >=90 → 14 (90-), それ以外は5歳刻み
 * 18歳未満も 0 にクランプ（18-24区分の基準で表示）
 */
export function ageGroupIndex(age: number): number {
  if (age < 25) return 0
  if (age >= 90) return 14
  return Math.floor((age - 25) / 5) + 1
}

/** 18歳未満（マスターズ登録不可、注記表示用） */
export function isUnderage(age: number): boolean {
  return age < 18
}
