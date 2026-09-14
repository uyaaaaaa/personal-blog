#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { KINDS, SUFFIX, args } from '../../scripts/session-args.mjs'
import { read } from '../../scripts/stdin.mjs'
import { state } from './state.mjs'

const SKILL = '.claude/skills/dispatch/SKILL.md'
const SCRIPT = 'scripts/session-args.mjs'
const KEY = 'dispatch'
const FRESH = { sessions: 0, posts: 0 }

const SESSIONS = /最大(\d+)本/
const POSTS = /1回の発火につき最大(\d+)つ/
const CHANNEL = /`(#[a-z0-9-]+)`（`(C[A-Z0-9]+)`）/

const NAMED = /^mcp__.+?__(.+)$/
const STARTING = 'create_session'
const POSTING = new Set(['slack_send_message', 'slack_schedule_message'])
// 下書きはチャンネルに出ないので、発火あたりの本数には数えない
const DRAFTING = 'slack_send_message_draft'

const NUMBER = /#([1-9][0-9]*)/g
const BRANCH = /^作業ブランチは (\S+) にする。$/

export const rules = (source) => {
	const channel = CHANNEL.exec(source)
	return {
		sessions: Number(SESSIONS.exec(source)?.[1]),
		posts: Number(POSTS.exec(source)?.[1]),
		room: channel?.[1],
		channel: channel?.[2],
	}
}

const complete = (it) =>
	[it.sessions, it.posts].every(Number.isFinite) && typeof it.channel === 'string'

const branched = (prompt) => {
	const branch = prompt
		.split('\n')
		.map((line) => BRANCH.exec(line)?.[1])
		.find((found) => found !== undefined)
	return { branch, tail: branch?.slice(branch.lastIndexOf('-') + 1) }
}

// どの種類の出力かは名乗らせず、出せる引数を総当たりで作って突き合わせる。
// 種類ごとの題と本文の文面を、出す側と読む側の2箇所に持たないため
const guesses = (title, prompt) => {
	const numbers = [...new Set([...`${title}\n${prompt}`.matchAll(NUMBER)].map(([, it]) => it))]
	const body = prompt
		.split('\n')
		.filter((line) => !BRANCH.test(line))
		.slice(0, -1)
	return KINDS.flatMap((kind) => [
		...numbers.map((number) => [kind, [number]]),
		[kind, [title, ...body]],
	])
}

const differs = (actual, want) =>
	[...new Set([...Object.keys(actual), ...Object.keys(want)])].filter(
		(key) => actual[key] !== want[key],
	)

const mismatch = (input) => {
	const { title, prompt } = input
	if (typeof title !== 'string' || typeof prompt !== 'string') {
		return `title と prompt が無い。node ${SCRIPT} <種類> の出力をそのまま渡す`
	}

	const { branch, tail } = branched(prompt)
	if (branch !== undefined && !SUFFIX.test(tail)) {
		return `ブランチ名の接尾辞が ${SCRIPT} の形と違う: ${branch}`
	}

	const found = guesses(title, prompt)
		.map(([kind, rest]) => args(kind, rest, tail ?? ''))
		.filter((want) => want.error === undefined)
		.map((want) => differs(input, want))
		.sort((one, other) => one.length - other.length)

	if (found[0]?.length === 0) return null
	return `${SCRIPT} の出力と違う（${(found[0] ?? Object.keys(input)).join(' / ')}）。出力を書き換えずに渡す`
}

const failed = (input) => Boolean(input.tool_response?.isError || input.tool_response?.is_error)

export const decide = (input, ask = ASK) => {
	// 常駐の Routine は同じセッションに発火するので、発火の境目でしか数えは戻らない
	if (input.hook_event_name === 'UserPromptSubmit') {
		ask.state(KEY, { session_id: input.session_id }).write(FRESH)
		return null
	}

	const tool = NAMED.exec(input.tool_name ?? '')?.[1] ?? ''
	if (tool !== STARTING && !POSTING.has(tool) && tool !== DRAFTING) return null

	const it = rules(ask.skill())
	if (!complete(it)) return null

	// 兄弟セッションも Slack も、投げた先ではなく起こした回で数える
	const box = ask.state(KEY, { session_id: input.session_id })
	const held = { ...FRESH, ...box.read() }

	if (input.hook_event_name === 'PostToolUse') {
		if (failed(input)) return null
		if (tool === STARTING) box.write({ ...held, sessions: held.sessions + 1 })
		else if (POSTING.has(tool)) box.write({ ...held, posts: held.posts + 1 })
		return null
	}

	if (tool === STARTING) {
		return (
			mismatch(input.tool_input ?? {}) ??
			(held.sessions >= it.sessions
				? `この発火で既に ${held.sessions} 本起こしている。1回の発火に最大${it.sessions}本`
				: null)
		)
	}

	const channel = input.tool_input?.channel_id
	if (channel !== it.channel) {
		return `Slack に出すのは ${it.room}（${it.channel}）だけ。${channel ?? 'なし'} には出さない`
	}
	return POSTING.has(tool) && held.posts >= it.posts
		? `この発火で既に ${held.posts} つ投稿している。1回の発火に最大${it.posts}つ`
		: null
}

const root = () => process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

const ASK = { skill: () => readFileSync(join(root(), SKILL), 'utf8'), state }

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('dispatch-guard.mjs')) {
	// 判定できないときは黙って通す。フックがツール呼び出しを止めない
	try {
		const reason = decide(JSON.parse((await read()) || '{}'))
		if (reason) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						permissionDecision: 'deny',
						permissionDecisionReason: reason,
					},
				}),
			)
		}
	} catch {}
}
