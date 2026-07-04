/**
 * プロフィールの React state ⇄ localStorage write-through フック。
 *
 * 注意: swimAge / ageIdx などの派生値はこのフックでは計算しない。
 * core/age.ts の swimAge() / ageGroupIndex() を呼び出し側で適用すること。
 * （storage/hooks 層を core の純関数実装から独立させるための設計）
 */

import { useCallback, useState } from 'react'
import type { Profile } from '../core/types'
import {
  clearProfile as removeStoredProfile,
  loadProfile,
  saveProfile as persistProfile,
} from '../storage/profile'

export interface UseProfileResult {
  /** 保存済みプロフィールの生値。未設定なら null */
  profile: Profile | null
  /** 保存して state を更新。localStorage への書き込み成功で true */
  saveProfile: (next: Profile) => boolean
  /** プロフィールを削除して null に戻す */
  clearProfile: () => void
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile())

  const saveProfile = useCallback((next: Profile): boolean => {
    setProfile(next)
    return persistProfile(next)
  }, [])

  const clearProfile = useCallback(() => {
    setProfile(null)
    removeStoredProfile()
  }, [])

  return { profile, saveProfile, clearProfile }
}
