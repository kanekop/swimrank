/**
 * マイ記録の永続化（swimrank:v1:records）。
 * キーは性別中立の EventKey（例 "50Br"）なので、性別変更時も再判定だけで済む。
 */

import type { RecordEntry, RecordsMap } from 'swimrank-core'
import { load, remove, save } from './storage'

function isRecordEntry(v: unknown): v is RecordEntry {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.timeCs === 'number' &&
    Number.isInteger(o.timeCs) &&
    o.timeCs > 0 &&
    typeof o.date === 'string'
  )
}

/** 保存済み記録を読み込む。形式不正なエントリは黙って捨てる。未保存は {} */
export function loadRecords(): RecordsMap {
  const v = load<unknown>('records')
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {}
  const out: RecordsMap = {}
  for (const [key, entry] of Object.entries(v)) {
    if (isRecordEntry(entry)) out[key] = entry
  }
  return out
}

/** 記録マップ全体を保存する。成功で true */
export function saveRecords(records: RecordsMap): boolean {
  return save('records', records)
}

/** 記録をすべて削除する */
export function clearRecords(): void {
  remove('records')
}
