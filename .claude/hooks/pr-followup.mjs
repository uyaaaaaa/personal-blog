#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dispatched, eventOf, plain, resolve, rules, source } from '../../scripts/review-rules.mjs'
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

const payloadOf = (found, ask) => {
	if (found.review !== undefined) return found.review
	if (found.path === undefined) return null
	// 読み取りの手段ごと無い呼び出し元もある。読めない回は判定を見ないだけにする
	try {
		return ask.payload(found.path)
	} catch {
		return null
	}
}

// 判定を読めない回は数えない。読めないことを未 Approve と扱うと、起こし直す先が無いまま止め続ける
const eventIn = (found, ask) => {
	const text = payloadOf(found, ask)
	if (text === null) return null
	try {
		const { event } = JSON.parse(text)
		return typeof event === 'string' ? event : null
	} catch {
		return null
	}
}

// 回数は発火ごとに数える。判定を読めなかった回を飛ばすと、guard が塞ぐ発火を Stop が求める
const counted = (input, kept, workflow, ask) => {
	const found = dispatched(input)
	if (!found || !named(found.workflow, workflow)) return null

	const pull = found.pr === undefined ? undefined : kept[found.pr]
	if (!pull) return null

	// 読めなかった巡は判定を持ち越さない。前の巡の判定を根拠に止めない
	const { verdict, ...rest } = pull
	const event = eventIn(found, ask)
	return {
		...kept,
		[found.pr]: {
			...rest,
			...(event === null ? {} : { verdict: event }),
			rounds: (rest.rounds ?? 0) + 1,
		},
	}
}

const stepped = (input, kept, workflow) => {
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

const recorded = (input, kept, workflow, ask) => {
	if (failed(input)) return null

	if (called(input, 'create_pull_request')) {
		const number = opened(input.tool_response)
		if (number === null || kept[number]) return null
		return { ...kept, [number]: { done: [], asked: null } }
	}

	const next = stepped(input, kept, workflow) ?? kept
	return counted(input, next, workflow, ask) ?? (next === kept ? null : next)
}

const missing = (pull) => STEPS.filter(({ key }) => !pull.done.includes(key))

// 指摘が要らない判定が Approve。名前も打ち切りの回数も review から引く
const approving = (it) => {
	const found = it.judgments?.find(({ needs }) => needs.length === 0)
	return found ? eventOf(found.name) : null
}

// 出し直せなくなった PR で止め続けない
const waiting = (pull, { rounds, approved }) =>
	typeof pull.verdict === 'string' &&
	approved !== null &&
	pull.verdict !== approved &&
	Number.isFinite(rounds) &&
	pull.rounds <= rounds

const pending = (pull, until) => {
	const left = missing(pull)
	if (left.length > 0) {
		return {
			at: left.map(({ key }) => key).join(','),
			how: left.map(({ how }) => how).join(' / '),
		}
	}
	if (!waiting(pull, until)) return null
	return {
		at: `${pull.verdict}.${pull.rounds}`,
		how: `判定が ${pull.verdict} のまま。指摘に対応し、レビューを起こし直す（直しが無く返信だけの巡でも起こす）`,
	}
}

const blocking = (kept, until) => {
	const next = { ...kept }
	const lines = []
	for (const [number, pull] of Object.entries(kept)) {
		const left = pending(pull, until)
		// 同じ状態で2度は止めない。手段が無いセッションを終われなくしない
		if (!left || pull.asked === left.at) continue
		next[number] = { ...pull, asked: left.at }
		lines.push(`PR #${number}: ${left.how}`)
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

const ASK = {
	skill: () => source(join(root(), SKILL)),
	payload: (path) => readFileSync(resolve(path, root()), 'utf8'),
}

// 読めなければ名前で絞らず、判定でも止めない。終われないセッションを作らない
const ruled = (ask) => {
	try {
		return rules(ask.skill())
	} catch {
		return {}
	}
}

export const decide = (input, store, ask = ASK) => {
	const kept = store.read() ?? {}
	const it = ruled(ask)

	if (input.hook_event_name === 'Stop') {
		const found = blocking(kept, { rounds: it.rounds, approved: approving(it) })
		if (!found) return null
		store.write(found.kept)
		return found.reason
	}

	const next = recorded(input, kept, it.workflow, ask)
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
