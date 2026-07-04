/**
 * オンボーディング #/onboarding（タブバー非表示）。
 * 名前・生年月日・性別を入力して保存 → #/ へ。
 * 生年月日入力済みなら「水泳年齢: 52歳 → 50-54区分」ライブプレビュー。
 */

import { useState } from 'react'
import { navigate } from '../app/router'
import { ageGroupIndex, isUnderage, swimAge } from '../core/age'
import { ageGroupLabel } from '../core/labels'
import type { Gender, Profile } from '../core/types'
import { ChipSelector } from '../components/ChipSelector'
import styles from './Onboarding.module.css'

const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/

const GENDER_OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: 'M', label: '男子' },
  { value: 'F', label: '女子' },
]

export interface OnboardingProps {
  /** 既存プロフィール（再訪時のプレフィル用）。初回は null */
  profile: Profile | null
  saveProfile: (p: Profile) => boolean
}

export function Onboarding({ profile, saveProfile }: OnboardingProps) {
  const [name, setName] = useState(profile?.name ?? '')
  const [birthdate, setBirthdate] = useState(profile?.birthdate ?? '')
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null)

  const today = new Date()
  const birthdateValid = BIRTHDATE_RE.test(birthdate)
  const age = birthdateValid ? swimAge(birthdate, today) : null
  const ageValid = age !== null && age >= 0 && age <= 120
  const canSubmit = name.trim() !== '' && ageValid && gender !== null

  function handleSubmit() {
    if (!canSubmit || gender === null) return
    saveProfile({ name: name.trim(), birthdate, gender })
    navigate({ name: 'home' }, { replace: true })
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>swimrank</h1>
        <p className={styles.tagline}>あなたのタイム、何級？</p>
      </header>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ob-name">
          お名前（ニックネーム）
        </label>
        <input
          id="ob-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: かねこ"
          autoComplete="nickname"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ob-birthdate">
          生年月日
        </label>
        <input
          id="ob-birthdate"
          className={styles.input}
          type="date"
          value={birthdate}
          max={today.toISOString().slice(0, 10)}
          onChange={(e) => setBirthdate(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>性別（大会区分）</span>
        <ChipSelector options={GENDER_OPTIONS} value={gender} onChange={setGender} label="性別" />
      </div>

      {ageValid && age !== null && (
        <div className={styles.preview}>
          水泳年齢: {age}歳 → {ageGroupLabel(ageGroupIndex(age))}区分
          {isUnderage(age) && (
            <p className={styles.note}>マスターズ登録は18歳から。18-24区分の基準で表示します</p>
          )}
        </div>
      )}

      <button type="button" className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
        はじめる
      </button>
    </div>
  )
}
