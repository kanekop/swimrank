export type Gender = 'M' | 'F'
export type Stroke = 'Fr' | 'Bc' | 'Br' | 'Bt' | 'IM'

/** 性別中立の種目キー。例: "50Br", "1500Fr" */
export type EventKey = string
/** データ側の種目ID。例: "men50Br" */
export type EventId = string

export interface Profile {
  name: string
  /** ISO形式 "1973-05-02" */
  birthdate: string
  gender: Gender
}

export interface RecordEntry {
  /** 整数センチ秒 */
  timeCs: number
  /** 保存日 ISO形式 */
  date: string
}

export type RecordsMap = Partial<Record<EventKey, RecordEntry>>
