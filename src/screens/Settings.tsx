/**
 * 設定 #/settings
 * - プロフィール編集（変更即保存 + トースト）+ 年齢区分プレビュー
 * - データ: マイ記録全削除（confirm）、記録コピー（クリップボードにJSON）
 * - アプリ情報: バージョン、データ出典、推定値の説明
 * - localStorage 不可時は「端末に保存できません」バナー
 */

import { useState } from 'react'
import { ageGroupIndex, isUnderage, swimAge } from '../core/age'
import { dataMeta } from '../core/data'
import { ageGroupLabel } from '../core/labels'
import type { Gender, Profile, RecordsMap } from '../core/types'
import { storageAvailable } from '../storage/storage'
import { ChipSelector } from '../components/ChipSelector'
import { Toast } from '../components/Toast'
import styles from './Settings.module.css'

const APP_VERSION = '0.1.0'
const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/

const GENDER_OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: 'M', label: '男子' },
  { value: 'F', label: '女子' },
]

export interface SettingsProps {
  profile: Profile
  saveProfile: (p: Profile) => boolean
  records: RecordsMap
  clearRecords: () => void
}

export function Settings({ profile, saveProfile, records, clearRecords }: SettingsProps) {
  const [toast, setToast] = useState<string | null>(null)
  const [name, setName] = useState(profile.name)

  const age = swimAge(profile.birthdate, new Date())
  const ageIdx = ageGroupIndex(age)
  const canStore = storageAvailable()
  const recordCount = Object.keys(records).length

  function persist(next: Profile) {
    const ok = saveProfile(next)
    setToast(ok ? '保存しました' : 'この端末には保存できませんでした')
  }

  function commitName() {
    const trimmed = name.trim()
    if (trimmed === '') {
      setName(profile.name)
      return
    }
    setName(trimmed)
    if (trimmed !== profile.name) persist({ ...profile, name: trimmed })
  }

  function handleBirthdateChange(v: string) {
    if (BIRTHDATE_RE.test(v)) persist({ ...profile, birthdate: v })
  }

  function handleClearRecords() {
    if (!window.confirm(`マイ記録（${recordCount}件）をすべて削除します。よろしいですか？`)) return
    clearRecords()
    setToast('マイ記録を削除しました')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(records, null, 2))
      setToast('記録をコピーしました')
    } catch {
      setToast('コピーできませんでした')
    }
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>設定</h1>

      {!canStore && (
        <div className={styles.banner} role="alert">
          端末に保存できません。プロフィールや記録はこのセッションの間だけ有効です。
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>プロフィール</h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="st-name">
            お名前（ニックネーム）
          </label>
          <input
            id="st-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            autoComplete="nickname"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="st-birthdate">
            生年月日
          </label>
          <input
            id="st-birthdate"
            className={styles.input}
            type="date"
            value={profile.birthdate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => handleBirthdateChange(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>性別（大会区分）</span>
          <ChipSelector
            options={GENDER_OPTIONS}
            value={profile.gender}
            onChange={(g) => persist({ ...profile, gender: g })}
            label="性別"
          />
        </div>
        <div className={styles.preview}>
          水泳年齢 {age}歳 ・ {ageGroupLabel(ageIdx)}区分
          {isUnderage(age) && (
            <p className={styles.note}>マスターズ登録は18歳から。18-24区分の基準で表示しています</p>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>データ</h2>
        <button type="button" className="btn-secondary" onClick={handleCopy}>
          記録をコピー（{recordCount}件）
        </button>
        <button type="button" className={styles.dangerBtn} onClick={handleClearRecords}>
          マイ記録をすべて削除
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>アプリ情報</h2>
        <div className={styles.info}>
          <p>バージョン: {APP_VERSION}</p>
          <p>
            データ出典:{' '}
            <a href={dataMeta.source} target="_blank" rel="noreferrer">
              {dataMeta.sourceName}
            </a>
            （取得日 {dataMeta.fetchedAt.slice(0, 10)}）
          </p>
          <p>
            推定値とは: 元データの欠損・誤植を近傍の級・年齢区分から補修した参考値です。該当する基準タイムには
            * を付けて表示しています。
          </p>
          <p>開発: Yoshimune Kaneko</p>
        </div>
      </section>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
