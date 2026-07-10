/**
 * 最後に判定した泳法/距離（swimrank:v1:lastEvent）の write-through フック。
 * 級判定フォームの初期値復元と、横断ビューのデフォルト決定に使う。
 */

import { useCallback, useState } from 'react'
import type { Stroke } from 'swimrank-core'
import { isStroke } from '../app/router'
import { load, save } from '../storage/storage'

export interface LastEvent {
  stroke: Stroke
  distance: number
}

function isLastEvent(v: unknown): v is LastEvent {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    isStroke(o.stroke) &&
    typeof o.distance === 'number' &&
    Number.isInteger(o.distance) &&
    o.distance > 0
  )
}

export interface UseLastEventResult {
  /** 前回の泳法/距離。未保存・形式不正は null */
  lastEvent: LastEvent | null
  /** 保存して state を更新 */
  setLastEvent: (next: LastEvent) => void
}

export function useLastEvent(): UseLastEventResult {
  const [lastEvent, setLastEventState] = useState<LastEvent | null>(() => {
    const v = load<unknown>('lastEvent')
    return isLastEvent(v) ? v : null
  })

  const setLastEvent = useCallback((next: LastEvent) => {
    setLastEventState(next)
    save('lastEvent', next)
  }, [])

  return { lastEvent, setLastEvent }
}
