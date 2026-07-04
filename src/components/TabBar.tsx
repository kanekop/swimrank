/**
 * 下部固定タブバー。[ホーム #/] [ランク判定 #/kentei] [ランク内で比較 #/cross] [設定 #/settings]
 * safe-area-inset-bottom 対応、現在ルートをハイライト。
 * オンボーディング中は App 側で描画しないこと（タブバー非表示仕様）。
 */

import type { ReactNode } from 'react'
import type { Route } from '../app/router'
import styles from './TabBar.module.css'

interface TabDef {
  key: string
  label: string
  icon: ReactNode
  href: string
  isActive: (route: Route) => boolean
}

// モノラインSVGアイコン（24px・線幅1.9・currentColor継承 —
// アクティブ時は既存CSSのプライマリ色が stroke に乗る）
const iconSvg = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

// ホーム
const HomeIcon = () => (
  <svg {...iconSvg} aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
)

// ランク判定（ストップウォッチ）
const StopwatchIcon = () => (
  <svg {...iconSvg} aria-hidden="true">
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 6V3.2" />
    <path d="M9.4 3.2h5.2" />
    <path d="M18.6 7 20.1 5.5" />
    <path d="M12 13.5V9.3" />
  </svg>
)

// ランク内で比較（棒グラフ）
const CompareIcon = () => (
  <svg {...iconSvg} aria-hidden="true">
    <path d="M4 20h16" />
    <path d="M7.5 20v-4" />
    <path d="M12 20v-7" />
    <path d="M16.5 20v-10" />
  </svg>
)

// 設定（スライダー）
const SettingsIcon = () => (
  <svg {...iconSvg} aria-hidden="true">
    <path d="M3 6 H9" />
    <path d="M13 6 H21" />
    <path d="M11 4 V8" />
    <path d="M3 12 H8" />
    <path d="M12 12 H21" />
    <path d="M10 10 V14" />
    <path d="M3 18 H12" />
    <path d="M16 18 H21" />
    <path d="M14 16 V20" />
  </svg>
)

const TABS: readonly TabDef[] = [
  {
    key: 'home',
    label: 'ホーム',
    icon: <HomeIcon />,
    href: '#/',
    isActive: (r) => r.name === 'home',
  },
  {
    key: 'kentei',
    label: 'ランク判定',
    icon: <StopwatchIcon />,
    href: '#/kentei',
    isActive: (r) => r.name === 'kentei' || r.name === 'kentei-result',
  },
  {
    key: 'cross',
    label: 'ランク内で比較',
    icon: <CompareIcon />,
    href: '#/cross',
    isActive: (r) => r.name === 'cross',
  },
  {
    key: 'settings',
    label: '設定',
    icon: <SettingsIcon />,
    href: '#/settings',
    isActive: (r) => r.name === 'settings',
  },
]

export interface TabBarProps {
  route: Route
}

export function TabBar({ route }: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label="メインナビゲーション">
      <ul className={styles.list}>
        {TABS.map((tab) => {
          const active = tab.isActive(route)
          return (
            <li key={tab.key} className={styles.item}>
              <a
                href={tab.href}
                className={active ? `${styles.link} ${styles.active}` : styles.link}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.icon} aria-hidden="true">
                  {tab.icon}
                </span>
                <span className={styles.label}>{tab.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
