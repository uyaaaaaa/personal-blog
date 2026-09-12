#!/usr/bin/env node
import { state } from './state.mjs'

const PULL = /\/pull\/(\d+)/

const suffix = (name) => (name.startsWith('mcp__') ? name.replace(/^mcp__.*?__/, '') : name)

const matches = (value, pattern) => typeof value === 'string' && pattern.test(value)

// assign の「5. 見届ける」。ツール名は MCP サーバ名を挟むので、末尾だけを見る。
// 番号に触れただけの呼び出しで埋まらないよう、その手段の形まで見る
const STEPS = [
	{
		key: 'subscribe',
		tool: 'subscribe_pr_activity',
		how: 'PR のイベントを購読する',
		at: (args, number) => args.pullNumber === number,
	},
	{
		key: 'title',
		tool: 'set_session_title',
		how: 'セッション名を PR #N に変える',
		at: (args, number) => matches(args.title, new RegExp(`#\\s*${number}(?!\\d)`)),
	},
	{
		key: 'review',
		tool: 'create_session',
		how: 'レビュー用のセッションを起こす（node scripts/session-args.mjs review N）',
		at: (args, number) =>
			matches(args.prompt, /review/) &&
			matches(args.prompt, new RegExp(`/pull/${number}(?!\\d)`)),
	},
]

const opened = (response) => {
	const found = PULL.exec(
		typeof response === 'string' ? response : JSON.stringify(response ?? ''),
	)
	return found ? Number(found[1]) : null
}

const recorded = (input, kept) => {
	const tool = suffix(input.tool_name ?? '')
	const args = input.tool_input ?? {}

	if (tool === 'create_pull_request') {
		const number = opened(input.tool_response)
		if (number === null || kept[number]) return null
		return { ...kept, [number]: { done: [], asked: null } }
	}

	const step = STEPS.find((it) => it.tool === tool)
	if (!step) return null

	const next = { ...kept }
	let changed = false
	for (const [number, pull] of Object.entries(kept)) {
		if (pull.done.includes(step.key) || !step.at(args, Number(number))) continue
		next[number] = { ...pull, done: [...pull.done, step.key] }
		changed = true
	}
	return changed ? next : null
}

const missing = (pull) => STEPS.filter(({ key }) => !pull.done.includes(key))

const blocking = (kept) => {
	const next = { ...kept }
	const lines = []
	for (const [number, pull] of Object.entries(kept)) {
		const left = missing(pull)
		const keys = left.map(({ key }) => key).join(',')
		// 同じ不足で2度は止めない。手段が無いセッションを終われなくしない
		if (left.length === 0 || pull.asked === keys) continue
		next[number] = { ...pull, asked: keys }
		lines.push(`PR #${number}: ${left.map(({ how }) => how).join(' / ')}`)
	}
	return lines.length === 0
		? null
		: {
				kept: next,
				reason: [
					'PR を出したセッションが見届けを済ませていない。assign の「5. 見届ける」に従う。',
					...lines,
					'起こす手段が無ければ飛ばし、報告に「レビュー未依頼」と書いてから終える。',
				].join('\n'),
			}
}

export const decide = (input, store) => {
	const kept = store.read() ?? {}

	if (input.hook_event_name === 'Stop') {
		const found = blocking(kept)
		if (!found) return null
		store.write(found.kept)
		return found.reason
	}

	const next = recorded(input, kept)
	if (next) store.write(next)
	return null
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('pr-followup.mjs')) {
	try {
		const input = JSON.parse((await read()) || '{}')
		// サブエージェントの購読もセッションの見届けとして数える
		const reason = decide(input, state('pr-followup', { session_id: input.session_id }))
		if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }))
	} catch {}
}
