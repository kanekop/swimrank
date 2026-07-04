import { BirthdateInput } from 'swimrank'

/** 空の初期状態（年/月/日の3セル、数字キーパッド + 自動フォーカス送り） */
export const Empty = () => <BirthdateInput value={null} onChange={() => {}} />

/** 入力済み。下にエコーバック「1971年11月24日 → 水泳年齢 55歳」を出すのが利用側の作法 */
export const Filled = () => <BirthdateInput value="1971-11-24" onChange={() => {}} />

/** 不正な日付（2月30日）は赤リングになり onChange に null が渡る */
export const InvalidDay = () => <BirthdateInput value="1971-02-30" onChange={() => {}} />
