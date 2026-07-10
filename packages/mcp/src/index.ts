#!/usr/bin/env node
/**
 * swimrank MCP サーバー（stdio）。
 * マスターズ水泳の年齢別資格級（20級=最速〜1級）の判定・比較ツールを
 * AIエージェントに提供する。ロジックとデータは swimrank-core を使用。
 *
 * 登録例: claude mcp add --scope user swimrank -- node <repo>/packages/mcp/dist/index.js
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  AGE_GROUPS,
  DISTANCES,
  STROKES,
  ageGroupIndex,
  ageGroupLabel,
  crossDistance,
  crossStroke,
  dataMeta,
  eventLabel,
  formatCs,
  getEvent,
  gradeFor,
  gradeLabel,
  isUnderage,
  ladder,
  standardCs,
  strokeLabel,
  swimAge,
  type Gender,
  type Stroke,
} from 'swimrank-core'

// ── 入力の正規化 ──────────────────────────────────────────────

const STROKE_ALIASES: Record<string, Stroke> = {
  fr: 'Fr', 自由形: 'Fr', クロール: 'Fr', free: 'Fr', freestyle: 'Fr',
  bc: 'Bc', 背泳ぎ: 'Bc', 背泳: 'Bc', バック: 'Bc', back: 'Bc', backstroke: 'Bc',
  br: 'Br', 平泳ぎ: 'Br', ブレスト: 'Br', breast: 'Br', breaststroke: 'Br',
  bt: 'Bt', バタフライ: 'Bt', バッタ: 'Bt', fly: 'Bt', butterfly: 'Bt',
  im: 'IM', 個人メドレー: 'IM', 個メ: 'IM', メドレー: 'IM', medley: 'IM',
}

function parseStroke(raw: string): Stroke {
  const s = STROKE_ALIASES[raw.trim().toLowerCase()] ?? STROKE_ALIASES[raw.trim()]
  if (!s) {
    throw new Error(
      `泳法「${raw}」を認識できません。自由形/背泳ぎ/平泳ぎ/バタフライ/個人メドレー（または Fr/Bc/Br/Bt/IM）で指定してください。`,
    )
  }
  return s
}

function parseGender(raw: string): Gender {
  const g = raw.trim().toLowerCase()
  if (g === 'm' || g === '男子' || g === '男' || g === 'male') return 'M'
  if (g === 'f' || g === '女子' || g === '女' || g === 'female') return 'F'
  throw new Error(`性別「${raw}」を認識できません。男子/女子（または M/F）で指定してください。`)
}

/** "44.54" / "1:38.55" / "1.38.55" / 4454(センチ秒) → 整数センチ秒 */
function parseTimeToCs(raw: string | number): number {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw <= 0) {
      throw new Error('数値でタイムを渡す場合は正の整数センチ秒で指定してください（例: 44.54秒 → 4454）。')
    }
    return raw
  }
  const s = raw.trim().replace(/：/g, ':').replace(/秒$/, '')
  // "44.54" / "1:38.55" / "1.38.55"（分.秒.1/100）
  const m = s.match(/^(?:(\d+)[:.])?(\d{1,2})\.(\d{1,2})$/)
  if (m) {
    const min = m[1] ? Number(m[1]) : 0
    const sec = Number(m[2])
    const cent = Number(m[3].padEnd(2, '0'))
    if (min > 0 && sec >= 60) {
      throw new Error(`タイム「${raw}」の秒部分が60以上です。「1:38.55」のような形式で指定してください。`)
    }
    return min * 6000 + sec * 100 + cent
  }
  // "45" のような秒だけの指定
  const plain = s.match(/^(\d+)$/)
  if (plain) return Number(plain[1]) * 100
  throw new Error(`タイム「${raw}」を解釈できません。「44.54」「1:38.55」のような形式で指定してください。`)
}

function resolveAge(age?: number, birthdate?: string): number {
  if (age !== undefined) return age
  if (birthdate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      throw new Error(`生年月日「${birthdate}」は YYYY-MM-DD 形式で指定してください。`)
    }
    return swimAge(birthdate, new Date())
  }
  throw new Error('age（水泳年齢）か birthdate（生年月日 YYYY-MM-DD）のどちらかを指定してください。')
}

function requireEvent(gender: Gender, stroke: Stroke, distance: number) {
  const ev = getEvent(gender, stroke, distance)
  if (!ev) {
    throw new Error(
      `${distance}m${strokeLabel[stroke]} という種目は資格表にありません。${strokeLabel[stroke]}の距離: ${DISTANCES[stroke].join('/')}m`,
    )
  }
  return ev
}

function ageContext(age: number): string {
  const note = isUnderage(age)
    ? '（18歳未満のため18-24区分の基準で表示）'
    : ''
  return `水泳年齢${age}歳・${ageGroupLabel(ageGroupIndex(age))}区分${note}`
}

function text(s: string) {
  return { content: [{ type: 'text' as const, text: s }] }
}

function errorText(e: unknown) {
  return {
    content: [{ type: 'text' as const, text: `エラー: ${e instanceof Error ? e.message : String(e)}` }],
    isError: true,
  }
}

// ── サーバー定義 ──────────────────────────────────────────────

const server = new McpServer({ name: 'swimrank', version: '0.1.0' })

const personArgs = {
  gender: z.string().describe('性別（大会区分）: 男子/女子 または M/F'),
  age: z.number().int().optional().describe('水泳年齢（その年の12/31時点の満年齢）。birthdateとどちらか必須'),
  birthdate: z.string().optional().describe('生年月日 YYYY-MM-DD。指定すると水泳年齢を自動計算'),
}

server.registerTool(
  'judge_time',
  {
    description:
      'マスターズ水泳の資格級を判定する。泳法・距離・タイム・性別・年齢（または生年月日）から、何級か・次の級まであと何秒かを返す。',
    inputSchema: {
      stroke: z.string().describe('泳法: 自由形/背泳ぎ/平泳ぎ/バタフライ/個人メドレー（または Fr/Bc/Br/Bt/IM）'),
      distance: z.number().int().describe('距離（m）: 例 50, 100, 200'),
      time: z.union([z.string(), z.number()]).describe('タイム: "44.54" / "1:38.55" 形式、または整数センチ秒'),
      ...personArgs,
    },
  },
  async ({ stroke, distance, time, gender, age, birthdate }) => {
    try {
      const st = parseStroke(stroke)
      const g = parseGender(gender)
      const a = resolveAge(age, birthdate)
      const cs = parseTimeToCs(time)
      const ev = requireEvent(g, st, distance)
      const ageIdx = ageGroupIndex(a)
      const result = gradeFor(ev, ageIdx, cs)

      const head = `${eventLabel(st, distance)} ${formatCs(cs)}（${g === 'M' ? '男子' : '女子'}・${ageContext(a)}）`
      if (result.status === 'no-data') {
        return text(`${head}\n→ この年齢区分の基準データがありません。`)
      }
      if (result.status === 'kyugai') {
        const gap = result.gapCs !== null ? `あと${formatCs(result.gapCs)}秒縮めると${gradeLabel(result.firstGrade ?? 1)}` : ''
        return text(`${head}\n→ 級外（1級の基準に未到達）。${gap}`)
      }
      const lines = [`${head}\n→ **${gradeLabel(result.grade)}**`]
      if (result.grade === 20) {
        const std = standardCs(ev, 20, ageIdx)
        if (std !== null) lines.push(`最高位です。20級基準（${formatCs(std)}）より ${formatCs(std >= cs ? std - cs : 0)}秒 速い。`)
      } else if (result.nextGrade !== null && result.gapCs !== null) {
        const nextStd = standardCs(ev, result.nextGrade, ageIdx)
        lines.push(`次の${gradeLabel(result.nextGrade)}（基準 ${nextStd !== null ? formatCs(nextStd) : '?'}）まで あと${formatCs(result.gapCs)}秒。`)
      }
      return text(lines.join('\n'))
    } catch (e) {
      return errorText(e)
    }
  },
)

server.registerTool(
  'get_ladder',
  {
    description: '指定種目・年齢区分の資格級一覧（20級=最速〜1級の基準タイム表）を返す。',
    inputSchema: {
      stroke: z.string().describe('泳法: 自由形/背泳ぎ/平泳ぎ/バタフライ/個人メドレー（または Fr/Bc/Br/Bt/IM）'),
      distance: z.number().int().describe('距離（m）'),
      ...personArgs,
    },
  },
  async ({ stroke, distance, gender, age, birthdate }) => {
    try {
      const st = parseStroke(stroke)
      const g = parseGender(gender)
      const a = resolveAge(age, birthdate)
      const ev = requireEvent(g, st, distance)
      const ageIdx = ageGroupIndex(a)
      const rows = ladder(ev, ageIdx)
      if (rows.every((r) => r.timeCs === null)) {
        return text(`${eventLabel(st, distance)}（${ageContext(a)}）: この年齢区分の基準データがありません。`)
      }
      const body = rows
        .map((r) => `${gradeLabel(r.grade).padStart(4, '　')}: ${r.timeCs === null ? '―' : formatCs(r.timeCs) + (r.estimated ? '*' : '')}`)
        .join('\n')
      const foot = rows.some((r) => r.estimated) ? '\n* は推定値（元データ補修）' : ''
      return text(`${eventLabel(st, distance)}（${g === 'M' ? '男子' : '女子'}・${ageContext(a)}）の基準タイム:\n${body}${foot}`)
    } catch (e) {
      return errorText(e)
    }
  },
)

server.registerTool(
  'cross_compare',
  {
    description:
      '指定した級の基準タイムを、種目をまたいで比較する。同じ距離の全泳法と、同じ泳法の全距離を返す（「平泳ぎ8級はクロールだと何秒?」に答えるツール）。',
    inputSchema: {
      grade: z.number().int().min(1).max(20).describe('級（1〜20。20が最速）'),
      stroke: z.string().describe('基準の泳法'),
      distance: z.number().int().describe('基準の距離（m）'),
      ...personArgs,
    },
  },
  async ({ grade, stroke, distance, gender, age, birthdate }) => {
    try {
      const st = parseStroke(stroke)
      const g = parseGender(gender)
      const a = resolveAge(age, birthdate)
      const ageIdx = ageGroupIndex(a)
      const fmtRow = (label: string, timeCs: number | null, status: string, estimated: boolean) =>
        `  ${label}: ${status === 'no-event' ? '―（種目なし）' : timeCs === null ? '―（データなし）' : formatCs(timeCs) + (estimated ? '*' : '')}`

      const byStroke = crossStroke(g, distance, ageIdx, grade)
        .map((r) => fmtRow(strokeLabel[r.stroke], r.timeCs, r.status, r.estimated))
        .join('\n')
      const byDistance = crossDistance(g, st, ageIdx, grade)
        .map((r) => fmtRow(`${r.distance}m`, r.timeCs, r.status, r.estimated))
        .join('\n')
      return text(
        `${gradeLabel(grade)}の基準タイム（${g === 'M' ? '男子' : '女子'}・${ageContext(a)}）\n` +
          `【同じ距離で比べる: ${distance}m】\n${byStroke}\n` +
          `【同じ泳法で比べる: ${strokeLabel[st]}】\n${byDistance}`,
      )
    } catch (e) {
      return errorText(e)
    }
  },
)

server.registerTool(
  'list_events',
  {
    description: '資格表に存在する種目（泳法×距離）、年齢区分、データ出典を返す。',
    inputSchema: {},
  },
  async () => {
    const events = STROKES.map((s) => `${strokeLabel[s]}: ${DISTANCES[s].join('/')}m`).join('\n')
    return text(
      `【種目一覧】\n${events}\n\n【年齢区分】\n${AGE_GROUPS.join(', ')}\n` +
        `（年齢は水泳年齢 = その年の12/31時点の満年齢。級は20級が最速〜1級）\n\n` +
        `【データ出典】${dataMeta.sourceName}（取得日 ${dataMeta.fetchedAt.slice(0, 10)}）`,
    )
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
