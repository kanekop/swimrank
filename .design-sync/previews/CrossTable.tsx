import { CrossTable } from 'swimrank'

/**
 * 同じ距離で泳法横断（男子50-54区分・8級・50m、実データ）。
 * 基準種目=平泳ぎの行がハイライト。保存記録あり → 「✓44.54→8級」注記。
 * 個人メドレーに50mは存在しない → 「―（種目なし）」。
 */
export const SameDistance = () => (
  <CrossTable
    title="同じ距離で比べる（50m・8級）"
    variant="stroke"
    rows={[
      { stroke: 'Fr', distance: 50, status: 'ok', timeCs: 3406, estimated: false },
      { stroke: 'Bc', distance: 50, status: 'ok', timeCs: 4192, estimated: false },
      { stroke: 'Br', distance: 50, status: 'ok', timeCs: 4454, estimated: false },
      { stroke: 'Bt', distance: 50, status: 'ok', timeCs: 3799, estimated: false },
      { stroke: 'IM', distance: 50, status: 'no-event', timeCs: null, estimated: false },
    ]}
    baseStroke="Br"
    baseDistance={50}
    gender="M"
    ageIdx={6}
    records={{ '50Br': { timeCs: 4454, date: '2026-07-04' } }}
  />
)

/**
 * 同じ泳法で距離横断（平泳ぎ・8級・男子50-54区分）。基準距離=50mをハイライト。
 */
export const SameStroke = () => (
  <CrossTable
    title="同じ泳法で比べる（平泳ぎ・8級）"
    variant="distance"
    rows={[
      { stroke: 'Br', distance: 25, status: 'ok', timeCs: 1845, estimated: false },
      { stroke: 'Br', distance: 50, status: 'ok', timeCs: 4454, estimated: false },
      { stroke: 'Br', distance: 100, status: 'ok', timeCs: 9956, estimated: false },
      { stroke: 'Br', distance: 200, status: 'ok', timeCs: 22401, estimated: false },
    ]}
    baseStroke="Br"
    baseDistance={50}
    gender="M"
    ageIdx={6}
    records={{}}
  />
)

/**
 * 年齢区分データなしの行（背泳ぎ）→ 「―（データなし）」、推定値は「34.06*」。
 */
export const WithNoData = () => (
  <CrossTable
    title="同じ距離で比べる（50m・8級）"
    variant="stroke"
    rows={[
      { stroke: 'Fr', distance: 50, status: 'ok', timeCs: 3406, estimated: true },
      { stroke: 'Bc', distance: 50, status: 'no-data', timeCs: null, estimated: false },
      { stroke: 'Br', distance: 50, status: 'ok', timeCs: 4454, estimated: false },
      { stroke: 'Bt', distance: 50, status: 'ok', timeCs: 3799, estimated: false },
      { stroke: 'IM', distance: 50, status: 'no-event', timeCs: null, estimated: false },
    ]}
    baseStroke="Br"
    baseDistance={50}
    gender="M"
    ageIdx={6}
    records={{}}
  />
)
