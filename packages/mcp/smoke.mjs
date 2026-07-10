import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'node',
  args: [new URL('./dist/index.js', import.meta.url).pathname],
})
const client = new Client({ name: 'smoke', version: '0.0.1' })
await client.connect(transport)

const tools = await client.listTools()
console.log('tools:', tools.tools.map((t) => t.name).join(', '))

const show = async (name, args) => {
  const r = await client.callTool({ name, arguments: args })
  const t = r.content?.[0]?.text ?? '(no text)'
  console.log(`\n=== ${name} ===\n${t}`)
}

await show('judge_time', { stroke: '平泳ぎ', distance: 50, time: '44.54', gender: '男子', age: 53 })
await show('judge_time', { stroke: 'クロール', distance: 100, time: '1:30.00', gender: 'F', birthdate: '1971-11-24' })
await show('get_ladder', { stroke: 'Br', distance: 50, gender: 'M', age: 53 })
await show('cross_compare', { grade: 8, stroke: '平泳ぎ', distance: 50, gender: '男子', age: 53 })
await show('list_events', {})
await show('judge_time', { stroke: '横泳ぎ', distance: 50, time: '44.54', gender: 'M', age: 53 })

await client.close()
