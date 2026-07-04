import { ChipSelector } from 'swimrank'

/** 泳法の選択（判定画面の種目チップ、平泳ぎを選択中） */
export const Strokes = () => (
  <ChipSelector
    label="泳法"
    options={[
      { value: 'fr', label: '自由形' },
      { value: 'ba', label: '背泳ぎ' },
      { value: 'br', label: '平泳ぎ' },
      { value: 'fly', label: 'バタフライ' },
      { value: 'im', label: '個人メドレー' },
    ]}
    value="br"
    onChange={() => {}}
  />
)

/** 距離の選択（50mを選択中） */
export const Distances = () => (
  <ChipSelector
    label="距離"
    options={[
      { value: 25, label: '25m' },
      { value: 50, label: '50m' },
      { value: 100, label: '100m' },
      { value: 200, label: '200m' },
    ]}
    value={50}
    onChange={() => {}}
  />
)

/** 未選択状態（value=null、性別トグルの初期表示） */
export const Unselected = () => (
  <ChipSelector
    label="性別"
    options={[
      { value: 'men', label: '男子' },
      { value: 'women', label: '女子' },
    ]}
    value={null}
    onChange={() => {}}
  />
)
