/** プロフィールの永続化（swimrank:v1:profile） */

import type { Profile } from 'swimrank-core'
import { load, remove, save } from './storage'

const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isProfile(v: unknown): v is Profile {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.name === 'string' &&
    typeof o.birthdate === 'string' &&
    BIRTHDATE_RE.test(o.birthdate) &&
    (o.gender === 'M' || o.gender === 'F')
  )
}

/** 保存済みプロフィールを読み込む。未保存・形式不正は null */
export function loadProfile(): Profile | null {
  const v = load<unknown>('profile')
  return isProfile(v) ? v : null
}

/** プロフィールを保存する。成功で true */
export function saveProfile(profile: Profile): boolean {
  return save('profile', profile)
}

/** プロフィールを削除する */
export function clearProfile(): void {
  remove('profile')
}
