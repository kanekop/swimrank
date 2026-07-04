/** hashchange を購読して現在の Route を返すフック */

import { useMemo, useSyncExternalStore } from 'react'
import { parseHash, type Route } from './router'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getSnapshot(): string {
  return window.location.hash
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot)
  return useMemo(() => parseHash(hash), [hash])
}
