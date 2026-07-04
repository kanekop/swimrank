import { GradeStepper } from 'swimrank'

/** 横断ビュー上部の級ステッパー（8級を表示、両ボタン有効） */
export const Default = () => <GradeStepper grade={8} onChange={() => {}} />

/** 最高位の20級 — ＋ボタンが無効化される */
export const AtMax = () => <GradeStepper grade={20} onChange={() => {}} />

/** 最下位の1級 — −ボタンが無効化される */
export const AtMin = () => <GradeStepper grade={1} onChange={() => {}} />
