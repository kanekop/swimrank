import { TimeInput } from 'swimrank'

/** 空の初期状態（分:秒.1/100 の3分割、iOSでは数字テンキーが開く） */
export const Empty = () => <TimeInput value={null} onChange={() => {}} />

/** 値入り（44.54秒 = 4454センチ秒）。ストップウォッチ連携のプレフィルにも使う */
export const Prefilled = () => (
  <TimeInput value={null} initialCs={4454} onChange={() => {}} />
)

/** 分を含む長いタイム（1:38.55） */
export const WithMinutes = () => (
  <TimeInput value={null} initialCs={9855} onChange={() => {}} />
)
