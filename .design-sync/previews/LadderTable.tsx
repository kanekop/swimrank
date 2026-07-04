import { LadderTable } from 'swimrank'

// 男子50m平泳ぎ・50-54区分の実際の基準タイム（20級→1級、センチ秒）
const MEN_50BR_5054 = [
  3332, 3366, 3400, 3468, 3536, 3638, 3740, 3842, 3944, 4046, 4182, 4318,
  4454, 4590, 4726, 4896, 5066, 5236, 5406, 5576,
].map((timeCs, i) => ({ grade: 20 - i, timeCs, estimated: false }))

/** 自分の級（8級）をハイライト。アプリではこの行に自動スクロールする */
export const WithHighlight = () => (
  <LadderTable rows={MEN_50BR_5054} highlightGrade={8} />
)

/** 1級より遅いタイム → 最下部の「級外」行をハイライト */
export const KyugaiHighlight = () => (
  <LadderTable rows={MEN_50BR_5054} highlightKyugai />
)

/** 推定値（元データ補修セル）は「44.54*」+ 脚注、データなし級は「―」 */
export const EstimatedAndMissing = () => (
  <LadderTable
    rows={MEN_50BR_5054.map((r) =>
      r.grade === 13 ? { ...r, estimated: true }
      : r.grade === 4 || r.grade === 3 ? { ...r, timeCs: null }
      : r,
    )}
    highlightGrade={13}
  />
)
