#!/usr/bin/env node
import { join } from 'node:path'
import { dispatched, plain, rules, source } from '../../scripts/review-rules.mjs'
import { read } from '../../scripts/stdin.mjs'
import { state } from './state.mjs'

const SKILL = '.claude/skills/review'

const PULL = /\/pull\/(\d+)/

const suffix = (name) => (name.startsWith('mcp__') ? name.replace(/^mcp__.*?__/, '') : name)

const matches = (value, pattern) => typeof value === 'string' && pattern.test(value)

// 投稿先の正本は review スキル。改名されたら数え落とすので、名前は引いて突き合わせる
const named = (value, workflow) => workflow === undefined || plain(value) === plain(workflow)

const called = (input, tool) => suffix(input.tool_name ?? '') === tool

const STEPS = [
	{
		key: 'subscribe',
		how: 'PR のイベントを購読する',
		at: (input, number) =>
			called(input, 'subscribe_pr_activity') && input.tool_input?.pullNumber === number,
	},
	{
		key: 'title',
		how: 'セッション名を PR #N に変える',
		at: (input, number) =>
			called(input, 'set_session_title') &&
			matches(input.tool_input?.title, new RegExp(`#\\s*${number}(?!\\d)`)),
	},
	{
		key: 'review',
		how: 'レビューのエージェントを起こし、返った JSON を Review ワークフローの発火に渡す',
		// 起こしただけでは済まない。返った JSON を発火に渡したところまでを見届けと数える
		at: (input, number, workflow) => {
			const found = dispatched(input)
			return Boolean(found && named(found.workflow, workflow) && found.pr === String(number))
		},
	},
]

const opened = (response) => {
	const found = PULL.exec(
		typeof response === 'string' ? response : JSON.stringify(response ?? ''),
	)
	return found ? Number(found[1]) : null
}

const failed = (input) => Boolean(input.tool_response?.isError || input.tool_response?.is_error)

const recorded = (input, kept, workflow) => {
	if (failed(input)) return null

	if (called(input, 'create_pull_request')) {
		const number = opened(input.tool_response)
		if (number === null || kept[number]) return null
		return { ...kept, [number]: { done: [], asked: null } }
	}

	const next = { ...kept }
	let changed = false
	for (const [number, pull] of Object.entries(kept)) {
		const done = STEPS.filter(
			(step) => !pull.done.includes(step.key) && step.at(input, Number(number), workflow),
		).map(({ key }) => key)
		if (done.length === 0) continue
		next[number] = { ...pull, done: [...pull.done, ...done] }
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
					'PR を出したセッションが見届けを済ませていない。followup スキルに従う。',
					...lines,
				].join('\n'),
			}
}

const root = () => process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

const ASK = { skill: () => source(join(root(), SKILL)) }

// 読めなければ名前で絞らない。終われないセッションを作らない
const workflowOf = (ask) => {
	try {
		return rules(ask.skill()).workflow
	} catch {
		return undefined
	}
}

export const decide = (input, store, ask = ASK) => {
	const kept = store.read() ?? {}

	if (input.hook_event_name === 'Stop') {
		const found = blocking(kept)
		if (!found) return null
		store.write(found.kept)
		return found.reason
	}

	const next = recorded(input, kept, workflowOf(ask))
	if (next) store.write(next)
	return null
}

if (process.argv[1]?.endsWith('pr-followup.mjs')) {
	try {
		const input = JSON.parse((await read()) || '{}')
		const reason = decide(input, state('pr-followup', { session_id: input.session_id }))
		if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }))
	} catch {}
}
