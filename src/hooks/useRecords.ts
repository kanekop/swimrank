/** マイ記録の React state ⇄ localStorage write-through フック */

import { useCallback, useState } from 'react'
import type { EventKey, RecordEntry, RecordsMap } from 'swimrank-core'
import {
  clearRecords as removeStoredRecords,
  loadRecords,
  saveRecords as persistRecords,
} from '../storage/records'

export interface UseRecordsResult {
  /** 保存済み記録マップ（性別中立キー "50Br" など） */
  records: RecordsMap
  /** 1件保存/上書き。localStorage への書き込み成功で true */
  saveRecord: (key: EventKey, entry: RecordEntry) => boolean
  /** 1件削除 */
  removeRecord: (key: EventKey) => void
  /** 全件削除（設定画面「マイ記録をすべて削除」用） */
  clearRecords: () => void
}

export function useRecords(): UseRecordsResult {
  const [records, setRecords] = useState<RecordsMap>(() => loadRecords())

  const saveRecord = useCallback(
    (key: EventKey, entry: RecordEntry): boolean => {
      const next: RecordsMap = { ...records, [key]: entry }
      setRecords(next)
      return persistRecords(next)
    },
    [records],
  )

  const removeRecord = useCallback(
    (key: EventKey) => {
      const next: RecordsMap = { ...records }
      delete next[key]
      setRecords(next)
      persistRecords(next)
    },
    [records],
  )

  const clearRecords = useCallback(() => {
    setRecords({})
    removeStoredRecords()
  }, [])

  return { records, saveRecord, removeRecord, clearRecords }
}
