/**
 * オンボーディング #/onboarding（タブバー非表示）。
 * 名前・生年月日・性別を入力して保存 → #/ へ。
 * 生年月日入力済みなら「水泳年齢: 52歳 → 50-54区分」ライブプレビュー。
 */

import { useState } from 'react'
import { navigate } from '../app/router'
import { ageGroupIndex, isUnderage, swimAge } from 'swimrank-core'
import { ageGroupLabel } from 'swimrank-core'
import type { Gender, Profile } from 'swimrank-core'
import { BirthdateInput } from '../components/BirthdateInput'
import { ChipSelector } from '../components/ChipSelector'
import { Toast } from '../components/Toast'
import styles from './Onboarding.module.css'

const GENDER_OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: 'M', label: '男子' },
  { value: 'F', label: '女子' },
]

/** '1971-11-24' → '1971年11月24日'（エコーバック表示用） */
function birthdateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

export interface OnboardingProps {
  /** 既存プロフィール（再訪時のプレフィル用）。初回は null */
  profile: Profile | null
  saveProfile: (p: Profile) => boolean
  /** リセット直後に一度だけ出すトースト文言。なければ null */
  flash?: string | null
  onFlashDone?: () => void
}

export function Onboarding({ profile, saveProfile, flash = null, onFlashDone }: OnboardingProps) {
  const [name, setName] = useState(profile?.name ?? '')
  const [birthdate, setBirthdate] = useState<string | null>(profile?.birthdate ?? null)
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null)

  const today = new Date()
  const age = birthdate !== null ? swimAge(birthdate, today) : null
  const ageValid = age !== null && age >= 0 && age <= 120
  const canSubmit = name.trim() !== '' && ageValid && gender !== null

  function handleSubmit() {
    if (!canSubmit || gender === null || birthdate === null) return
    saveProfile({ name: name.trim(), birthdate, gender })
    navigate({ name: 'home' }, { replace: true })
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>スイムランク</h1>
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
        <span className={styles.label}>生年月日</span>
        <BirthdateInput value={birthdate} onChange={setBirthdate} />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>性別（大会区分）</span>
        <ChipSelector options={GENDER_OPTIONS} value={gender} onChange={setGender} label="性別" />
      </div>

      {ageValid && age !== null && birthdate !== null && (
        <div className={styles.preview}>
          {birthdateLabel(birthdate)} → 水泳年齢 {age}歳（{ageGroupLabel(ageGroupIndex(age))}区分）
          {isUnderage(age) && (
            <p className={styles.note}>マスターズ登録は18歳から。18-24区分の基準で表示します</p>
          )}
        </div>
      )}

      <button type="button" className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
        はじめる
      </button>

      <Toast message={flash} onDismiss={() => onFlashDone?.()} />
    </div>
  )
}
