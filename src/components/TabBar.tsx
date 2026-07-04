/**
 * 下部固定タブバー。[ホーム #/] [レベル判定 #/kentei] [レベル内で比較 #/cross] [設定 #/settings]
 * safe-area-inset-bottom 対応、現在ルートをハイライト。
 * オンボーディング中は App 側で描画しないこと（タブバー非表示仕様）。
 */

import type { Route } from '../app/router'
import styles from './TabBar.module.css'

interface TabDef {
  key: string
  label: string
  icon: string
  href: string
  isActive: (route: Route) => boolean
}

const TABS: readonly TabDef[] = [
  {
    key: 'home',
    label: 'ホーム',
    icon: '🏠',
    href: '#/',
    isActive: (r) => r.name === 'home',
  },
  {
    key: 'kentei',
    label: 'レベル判定',
    icon: '⏱️',
    href: '#/kentei',
    isActive: (r) => r.name === 'kentei' || r.name === 'kentei-result',
  },
  {
    key: 'cross',
    label: 'レベル内で比較',
    icon: '📊',
    href: '#/cross',
    isActive: (r) => r.name === 'cross',
  },
  {
    key: 'settings',
    label: '設定',
    icon: '⚙️',
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
