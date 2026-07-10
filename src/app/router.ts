/**
 * 自作ハッシュルーター（react-router 不使用）。
 * ルート定義の parse / build、navigate（hash 書き換え）、クエリパラメータ処理を担う。
 *
 * ルート一覧:
 *   #/onboarding
 *   #/
 *   #/kentei                    （v2: ?t=<センチ秒> でタイムプレフィル）
 *   #/kentei/result?e=50Br&t=4454   （t 省略時はラダーのみ表示モード）
 *   #/cross?grade=8&stroke=Br&distance=50
 *   #/settings
 */

import type { EventKey, Stroke } from 'swimrank-core'

/** 泳法の固定順リスト（core/data.ts 生成前でも自己完結するようここでも定義） */
export const STROKE_VALUES: readonly Stroke[] = ['Fr', 'Bc', 'Br', 'Bt', 'IM']

export function isStroke(v: unknown): v is Stroke {
  return typeof v === 'string' && (STROKE_VALUES as readonly string[]).includes(v)
}

export type Route =
  | { name: 'onboarding' }
  | { name: 'home' }
  | { name: 'kentei'; initialCs?: number | null }
  | { name: 'kentei-result'; eventKey?: EventKey | null; timeCs?: number | null }
  | {
      name: 'cross'
      grade?: number | null
      stroke?: Stroke | null
      distance?: number | null
    }
  | { name: 'settings' }

/** 正の整数のみ受理するクエリパラメータ検証。それ以外は null */
function parsePositiveInt(s: string | null): number | null {
  if (s === null || !/^\d+$/.test(s)) return null
  const n = Number(s)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/**
 * location.hash（"#/kentei/result?e=50Br&t=4454" 等）を Route に変換する。
 * 未知のパス・空ハッシュはホームにフォールバック。
 * クエリの不正値は null に落とす（画面側でデフォルトを適用する）。
 */
export function parseHash(hash: string): Route {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  const qIdx = h.indexOf('?')
  const path = (qIdx >= 0 ? h.slice(0, qIdx) : h) || '/'
  const query = new URLSearchParams(qIdx >= 0 ? h.slice(qIdx + 1) : '')

  switch (path) {
    case '/':
      return { name: 'home' }
    case '/onboarding':
      return { name: 'onboarding' }
    case '/kentei':
      return { name: 'kentei', initialCs: parsePositiveInt(query.get('t')) }
    case '/kentei/result': {
      const e = query.get('e')
      return {
        name: 'kentei-result',
        eventKey: e !== null && e !== '' ? e : null,
        timeCs: parsePositiveInt(query.get('t')),
      }
    }
    case '/cross': {
      const grade = parsePositiveInt(query.get('grade'))
      const strokeRaw = query.get('stroke')
      return {
        name: 'cross',
        grade: grade !== null && grade >= 1 && grade <= 20 ? grade : null,
        stroke: isStroke(strokeRaw) ? strokeRaw : null,
        distance: parsePositiveInt(query.get('distance')),
      }
    }
    case '/settings':
      return { name: 'settings' }
    default:
      return { name: 'home' }
  }
}

/** Route をハッシュ文字列（"#/..." 形式）に変換する。null/未指定のクエリは省略 */
export function buildHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'onboarding':
      return '#/onboarding'
    case 'kentei':
      return route.initialCs != null ? `#/kentei?t=${route.initialCs}` : '#/kentei'
    case 'kentei-result': {
      const q = new URLSearchParams()
      if (route.eventKey != null) q.set('e', route.eventKey)
      if (route.timeCs != null) q.set('t', String(route.timeCs))
      const qs = q.toString()
      return qs === '' ? '#/kentei/result' : `#/kentei/result?${qs}`
    }
    case 'cross': {
      const q = new URLSearchParams()
      if (route.grade != null) q.set('grade', String(route.grade))
      if (route.stroke != null) q.set('stroke', route.stroke)
      if (route.distance != null) q.set('distance', String(route.distance))
      const qs = q.toString()
      return qs === '' ? '#/cross' : `#/cross?${qs}`
    }
    case 'settings':
      return '#/settings'
  }
}

/** 現在の location.hash から Route を得る */
export function currentRoute(): Route {
  return parseHash(window.location.hash)
}

/**
 * ハッシュを書き換えて遷移する（hashchange 経由で useHashRoute が再描画）。
 * replace: true で履歴エントリを置き換える（オンボーディング強制リダイレクト用）。
 */
export function navigate(route: Route, opts?: { replace?: boolean }): void {
  const hash = buildHash(route)
  if (opts?.replace) {
    window.location.replace(hash)
  } else {
    window.location.hash = hash
  }
}
