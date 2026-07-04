/**
 * バージョン付き localStorage ラッパー。
 * キーは "swimrank:v1:<key>" 形式。壊れたJSON・quota超過・private mode では
 * 例外を握りつぶし、null / false を返してステートレス動作にフォールバックする。
 */

const VERSION = 'v1'
const PREFIX = `swimrank:${VERSION}:`

export type StorageKey = 'profile' | 'records' | 'lastEvent'

let availableCache: boolean | null = null

/** localStorage が実際に読み書き可能かを1度だけプローブして判定（結果はキャッシュ） */
export function storageAvailable(): boolean {
  if (availableCache !== null) return availableCache
  try {
    const probe = `${PREFIX}__probe__`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    availableCache = true
  } catch {
    availableCache = false
  }
  return availableCache
}

/** 保存値を読み込む。未保存・JSON破損・アクセス不可はすべて null */
export function load<T>(key: StorageKey): T | null {
  if (!storageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** 値をJSONで保存する。成功で true、quota超過等の失敗で false */
export function save<T>(key: StorageKey, value: T): boolean {
  if (!storageAvailable()) return false
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** 保存値を削除する（失敗は無視） */
export function remove(key: StorageKey): void {
  if (!storageAvailable()) return
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    // noop
  }
}

/**
 * スキーマ移行。v1 が最初のスキーマのため現状 no-op。
 * 将来バージョンアップ時に旧キーからの読み替え・変換をここに実装する。
 * アプリ起動時（App マウント前）に1度呼ぶ。
 */
export function migrate(): void {
  // no-op (v1)
}
