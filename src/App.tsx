/**
 * アプリのルート。useHashRoute でルート分岐し、各画面へ配線する。
 * - profile 未設定でオンボーディング以外に来たら #/onboarding へ強制リダイレクト
 * - オンボーディング以外ではタブバーを表示
 * - profile / records / lastEvent の各フックはここで一元管理して画面に渡す
 *   （画面ごとにフックを複製するとステートが分裂するため）
 */

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { navigate } from './app/router'
import { useHashRoute } from './app/useHashRoute'
import { useLastEvent } from './hooks/useLastEvent'
import { useProfile } from './hooks/useProfile'
import { useRecords } from './hooks/useRecords'
import { TabBar } from './components/TabBar'
import { Cross } from './screens/Cross'
import { Home } from './screens/Home'
import { Kentei } from './screens/Kentei'
import { KenteiResult } from './screens/KenteiResult'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import styles from './App.module.css'

export function App(): ReactElement | null {
  const route = useHashRoute()
  const { profile, saveProfile, clearProfile } = useProfile()
  const { records, saveRecord, clearRecords } = useRecords()
  const { lastEvent, setLastEvent } = useLastEvent()
  // オンボーディングへ遷移した先で出す一度きりのトースト（プロフィールリセット時）
  const [flash, setFlash] = useState<string | null>(null)

  const needsOnboarding = profile === null && route.name !== 'onboarding'
  useEffect(() => {
    if (needsOnboarding) navigate({ name: 'onboarding' }, { replace: true })
  }, [needsOnboarding])

  if (route.name === 'onboarding') {
    return (
      <main className={styles.main}>
        <Onboarding
          profile={profile}
          saveProfile={saveProfile}
          flash={flash}
          onFlashDone={() => setFlash(null)}
        />
      </main>
    )
  }

  // リダイレクト待ち（上の effect が発火するまで何も描画しない）
  if (profile === null) return null

  let screen: ReactElement | null = null
  switch (route.name) {
    case 'home':
      screen = <Home profile={profile} records={records} />
      break
    case 'kentei':
      screen = (
        <Kentei lastEvent={lastEvent} setLastEvent={setLastEvent} initialCs={route.initialCs ?? null} />
      )
      break
    case 'kentei-result':
      screen = (
        <KenteiResult
          profile={profile}
          eventKey={route.eventKey ?? null}
          timeCs={route.timeCs ?? null}
          records={records}
          saveRecord={saveRecord}
        />
      )
      break
    case 'cross':
      screen = (
        <Cross
          profile={profile}
          records={records}
          grade={route.grade ?? null}
          stroke={route.stroke ?? null}
          distance={route.distance ?? null}
          lastEvent={lastEvent}
        />
      )
      break
    case 'settings':
      screen = (
        <Settings
          profile={profile}
          saveProfile={saveProfile}
          records={records}
          clearRecords={clearRecords}
          clearProfile={clearProfile}
          onFlash={setFlash}
        />
      )
      break
  }

  return (
    <>
      <main className={styles.main}>{screen}</main>
      <TabBar route={route} />
    </>
  )
}
