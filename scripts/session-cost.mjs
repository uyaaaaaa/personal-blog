// セッションの記録（~/.claude/projects/<slug>/*.jsonl）から、入力トークンの内訳と
// ターンごとの積み上がりを出す。どのターンで跳ねたかを、感覚ではなく記録から言うための道具。
import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const PROJECTS = join(homedir(), '.claude', 'projects')
const SPIKES = 10
const ALONE = 6
const BYTES_PER_TOKEN = 4

const USAGE = [
	'使い方:',
	'  node scripts/session-cost.mjs               # 今のリポジトリの記録を全部',
	'  node scripts/session-cost.mjs <jsonl...>    # 指定した記録だけ',
]

// Claude Code はプロジェクトのパスの区切りをハイフンに畳んで置き場の名前にする
export const slug = (path) => path.replace(/[/.]/g, '-')

export const parse = (text) =>
	text
		.split('\n')
		.filter((line) => line.trim() !== '')
		.flatMap((line) => {
			try {
				return [JSON.parse(line)]
			} catch {
				return []
			}
		})

const toolsOf = (message) =>
	(message?.content ?? [])
		.filter((block) => block?.type === 'tool_use')
		.map((block) => block.name)

// 1つの応答が thinking / text / tool_use の行に割れて記録される。usage は同じものが並ぶ
export const turns = (records) => {
	const found = new Map()
	for (const record of records) {
		const { id, usage } = record.message ?? {}
		if (record.type !== 'assistant' || !usage || id === undefined) continue
		const seen = found.get(id) ?? {
			id,
			created: usage.cache_creation_input_tokens ?? 0,
			read: usage.cache_read_input_tokens ?? 0,
			out: usage.output_tokens ?? 0,
			tools: [],
		}
		found.set(id, { ...seen, tools: [...seen.tools, ...toolsOf(record.message)] })
	}
	return [...found.values()]
}

// prompt_snapshot は記録のために system prompt を丸ごと写したもので、毎ターン送られてはいない
const SNAPSHOT = 'prompt_snapshot'

export const prompt = (records) => {
	const snapshot = records.find((record) => record.attachment?.type === SNAPSHOT)
	const blocks = snapshot?.attachment?.systemPrompt ?? []
	return blocks.reduce((total, block) => total + Buffer.byteLength(JSON.stringify(block)), 0)
}

export const attachments = (records) => {
	const found = {}
	for (const record of records) {
		if (record.type !== 'attachment') continue
		const kind = record.attachment?.type ?? '?'
		if (kind === SNAPSHOT) continue
		const bytes = Buffer.byteLength(JSON.stringify(record.attachment))
		found[kind] = {
			count: (found[kind]?.count ?? 0) + 1,
			bytes: (found[kind]?.bytes ?? 0) + bytes,
		}
	}
	return found
}

// auto モードの分類器に止められた呼び出し。止められた回数だけ、文脈を読み直すターンが増える
const DENIED = 'Permission for this action was denied by the Claude Code auto mode classifier'

const textOf = (content) =>
	typeof content === 'string'
		? content
		: (content ?? []).map((block) => block?.text ?? '').join('')

export const denied = (records) =>
	records
		.filter((record) => record.type === 'user' && Array.isArray(record.message?.content))
		.flatMap((record) => record.message.content)
		.filter(
			(block) => block?.type === 'tool_result' && textOf(block.content).startsWith(DENIED),
		).length

// 単独で打たれた回数の多い順。名前だけ見えれば足りるので、並べたら数える
const alone = (rows) => {
	const found = new Map()
	for (const row of rows) {
		if (row.tools.length !== 1) continue
		found.set(row.tools[0], (found.get(row.tools[0]) ?? 0) + 1)
	}
	return [...found]
		.sort(([, one], [, other]) => other - one)
		.map(([name, count]) => ({ name, count }))
}

export const summary = (records) => {
	const rows = turns(records)
	const first = rows[0]
	const fixed = first === undefined ? 0 : first.created + first.read
	const input = rows.reduce((total, row) => total + row.created + row.read, 0)
	return {
		turns: rows.length,
		// 1ターン目の入力は、作業を始める前に払っている固定費そのもの
		fixed,
		input,
		// 固定費を除いた残りは、そのセッションで読んだり出したりして積み上げた分
		grown: input === 0 ? 0 : (input - fixed * rows.length) / input,
		// 並べて打てた呼び出しを別のターンにすると、そのぶん文脈全体を読み直す
		single: rows.filter((row) => row.tools.length === 1).length,
		// 何も打たずに返しただけのターンも、文脈全体を読み直す分は同じだけ払う
		idle: rows.filter((row) => row.tools.length === 0).length,
		// どの呼び出しが単独で打たれているかが、畳む先を決める
		alone: alone(rows),
		denied: denied(records),
		peak: rows.reduce((most, row) => Math.max(most, row.created + row.read), 0),
		created: rows.reduce((total, row) => total + row.created, 0),
		out: rows.reduce((total, row) => total + row.out, 0),
		spikes: [...rows]
			.map((row, at) => ({ ...row, at: at + 1 }))
			.sort((one, other) => other.created - one.created)
			.slice(0, SPIKES),
	}
}

const num = (value) => value.toLocaleString('en-US')

const report = (name, records) => {
	const it = summary(records)
	if (it.turns === 0) return

	console.log(`# ${name}`)
	console.log(`  ターン ${it.turns} / 固定費 ${num(it.fixed)} / 最大 ${num(it.peak)}`)
	console.log(`  cache_creation 合計 ${num(it.created)} / output 合計 ${num(it.out)}`)
	console.log(
		`  入力合計 ${num(it.input)} / うち積み上がり ${Math.round(it.grown * 100)}% / 分類器の拒否 ${it.denied}`,
	)
	console.log(`  ツール1個のターン ${it.single}/${it.turns} / 0個のターン ${it.idle}/${it.turns}`)
	if (it.alone.length > 0) {
		const top = it.alone
			.slice(0, ALONE)
			.map(({ name, count }) => `${name} x${count}`)
			.join(' / ')
		console.log(`  単独で打たれたもの: ${top}`)
	}
	console.log(`  system prompt ${num(prompt(records))} bytes`)

	const parts = Object.entries(attachments(records)).sort(
		([, one], [, other]) => other.bytes - one.bytes,
	)
	if (parts.length > 0) {
		console.log('  注入されたもの（bytes / 概算トークン）:')
		for (const [kind, { count, bytes }] of parts) {
			console.log(
				`    ${num(bytes).padStart(9)}  ≒${num(Math.round(bytes / BYTES_PER_TOKEN)).padStart(7)}  x${count}  ${kind}`,
			)
		}
	}

	console.log('  積み上げた上位:')
	for (const spike of it.spikes) {
		const tools = [...new Set(spike.tools)].join(' ') || '(応答のみ)'
		console.log(
			`    #${String(spike.at).padStart(3)}  +${num(spike.created).padStart(8)}  ${tools}`,
		)
	}
	console.log('')
}

const SUBAGENTS = 'subagents'

// サブエージェントは親と別の記録に出る。固定費も別に払うので、本流と並べて見えるようにする
const subagentsOf = (directory, log) => {
	try {
		const nested = join(directory, log.replace(/\.jsonl$/, ''), SUBAGENTS)
		return readdirSync(nested)
			.filter((name) => name.endsWith('.jsonl'))
			.map((name) => join(nested, name))
	} catch {
		return []
	}
}

export const named = (log, readMeta = readFileSync) => {
	const name = log.replace(/^.*\//, '')
	try {
		const { agentType } = JSON.parse(readMeta(log.replace(/\.jsonl$/, '.meta.json'), 'utf8'))
		return agentType === undefined ? name : `${name}  [${agentType}]`
	} catch {
		return name
	}
}

const logsOf = (paths) => {
	if (paths.length > 0) return paths.map((path) => resolve(path))
	const directory = join(PROJECTS, slug(process.cwd()))
	return readdirSync(directory)
		.filter((name) => name.endsWith('.jsonl'))
		.flatMap((name) => [join(directory, name), ...subagentsOf(directory, name)])
}

if (process.argv[1]?.endsWith('session-cost.mjs')) {
	let logs
	try {
		logs = logsOf(process.argv.slice(2))
	} catch (error) {
		console.error(`記録を読めない（${error.message}）`)
		for (const line of USAGE) console.error(line)
		process.exit(1)
	}

	for (const log of logs) report(named(log), parse(readFileSync(log, 'utf8')))
}
