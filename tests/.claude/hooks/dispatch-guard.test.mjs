import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decide, rules } from '~~/.claude/hooks/dispatch-guard.mjs'
import { args } from '~~/scripts/session-args.mjs'

const SOURCE = readFileSync(
	new URL('../../../.claude/skills/dispatch/SKILL.md', import.meta.url),
	'utf8',
)

const RULES = rules(SOURCE)

const ask = ({ held = null, source = SOURCE } = {}) => {
	const box = { value: held }
	return {
		skill: () => source,
		state: () => ({
			read: () => box.value,
			write: (value) => {
				box.value = value
			},
		}),
		box,
	}
}

const SESSION = 'mcp__bf7c680d-5fdc-5ef4-b4a0-abadb619bf0a__create_session'
const SLACK = 'mcp__e2c6e1da-fe96-4d68-bddd-32106686f56f__slack_send_message'
const DRAFT = `${SLACK}_draft`

const start = (input, event = 'PreToolUse') => ({
	hook_event_name: event,
	session_id: 's1',
	tool_name: SESSION,
	tool_input: input,
})

const post = (input, { tool = SLACK, event = 'PreToolUse', ...rest } = {}) => ({
	hook_event_name: event,
	session_id: 's1',
	tool_name: tool,
	tool_input: { message: '#295 を起こした', ...input },
	...rest,
})

const ISSUE = args('issue', ['295'], 'abc123')
const TASK = args('task', ['weekly-prune', 'prune スキルに従う。'], 'zz99qq')

describe('rules', () => {
	it('dispatch の手順書から本数とチャンネルを読める', () => {
		expect(RULES).toMatchObject({ sessions: 2, posts: 1, room: '#blog-agent' })
		expect(RULES.channel).toMatch(/^C[A-Z0-9]+$/)
	})
})

describe('create_session', () => {
	it('session-args の出力をそのまま渡せば通す', () => {
		for (const want of [ISSUE, TASK]) expect(decide(start(want), ask())).toBeNull()
	})

	it('出力を書き換えたら、違う項目を挙げて止める', () => {
		expect(decide(start({ ...ISSUE, model: 'haiku' }), ask())).toMatch('model')
		expect(decide(start({ ...ISSUE, source_url: undefined }), ask())).toMatch('source_url')
		expect(
			decide(start({ ...ISSUE, prompt: `${ISSUE.prompt}\n方針は utils に出す。` }), ask()),
		).toMatch('prompt')
		expect(decide(start({ ...ISSUE, append_system_prompt: '早く出す' }), ask())).toMatch(
			'append_system_prompt',
		)
		expect(decide(start({ title: 'issue #295' }), ask())).toMatch('title と prompt')
	})

	it('ブランチ名を手で書いたら止める', () => {
		const prompt = ISSUE.prompt.replace('claude/issue-295-abc123', 'claude/issue-295-fix')
		expect(decide(start({ ...ISSUE, prompt }), ask())).toMatch('接尾辞')
	})

	it('3本目で止める', () => {
		expect(decide(start(ISSUE), ask({ held: { sessions: 1, posts: 0 } }))).toBeNull()
		expect(decide(start(ISSUE), ask({ held: { sessions: 2, posts: 0 } }))).toMatch('最大2本')
	})

	it('起きた回だけを数える', () => {
		const asked = ask()
		decide(start(ISSUE, 'PostToolUse'), asked)
		expect(asked.box.value).toMatchObject({ sessions: 1 })
		decide({ ...start(ISSUE, 'PostToolUse'), tool_response: { isError: true } }, asked)
		expect(asked.box.value).toMatchObject({ sessions: 1 })
	})
})

describe('Slack', () => {
	it('規定のチャンネルへの1つ目は通す', () => {
		expect(decide(post({ channel_id: RULES.channel }), ask())).toBeNull()
	})

	it('規定外のチャンネルには出させない', () => {
		const reason = decide(post({ channel_id: 'C0OTHER' }), ask())
		expect(reason).toMatch('#blog-agent')
		expect(reason).toMatch('C0OTHER')
		expect(decide(post({ channel_id: undefined }), ask())).toMatch('なし')
	})

	it('同じセッションの2回目を止める', () => {
		const held = { sessions: 0, posts: 1 }
		expect(decide(post({ channel_id: RULES.channel }), ask({ held }))).toMatch('最大1つ')
		expect(
			decide(post({ channel_id: RULES.channel }, { tool: DRAFT }), ask({ held })),
		).toBeNull()
	})

	it('投稿は数え、下書きは数えない', () => {
		const asked = ask()
		decide(post({ channel_id: RULES.channel }, { tool: DRAFT, event: 'PostToolUse' }), asked)
		expect(asked.box.value).toBeNull()
		decide(post({ channel_id: RULES.channel }, { event: 'PostToolUse' }), asked)
		expect(asked.box.value).toMatchObject({ posts: 1 })
	})
})

describe('発火の境目', () => {
	const fired = () => ({ hook_event_name: 'UserPromptSubmit', session_id: 's1' })

	it('次の発火では、使い切った数えが戻る', () => {
		const asked = ask({ held: { sessions: 2, posts: 1 } })
		expect(decide(start(ISSUE), asked)).toMatch('最大2本')
		expect(decide(post({ channel_id: RULES.channel }), asked)).toMatch('最大1つ')

		decide(fired(), asked)

		expect(decide(start(ISSUE), asked)).toBeNull()
		expect(decide(post({ channel_id: RULES.channel }), asked)).toBeNull()
	})

	it('同じ発火の中では戻らない', () => {
		const asked = ask()
		decide(fired(), asked)
		decide(start(ISSUE, 'PostToolUse'), asked)
		decide(start(ISSUE, 'PostToolUse'), asked)
		expect(decide(start(ISSUE), asked)).toMatch('最大2本')
	})
})

describe('見ないもの', () => {
	it('関係ないツールと、読めない手順書は通す', () => {
		expect(decide({ tool_name: 'mcp__github__issue_write', tool_input: {} }, ask())).toBeNull()
		expect(decide({ tool_name: 'Bash', tool_input: {} }, ask())).toBeNull()
		expect(decide(post({ channel_id: 'C0OTHER' }), ask({ source: '' }))).toBeNull()
	})
})
