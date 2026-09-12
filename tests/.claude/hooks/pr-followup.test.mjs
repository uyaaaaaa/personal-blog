import { beforeEach, describe, expect, it } from 'vitest'
import { decide } from '~~/.claude/hooks/pr-followup.mjs'

let store

const opened = (number = 292) => ({
	hook_event_name: 'PostToolUse',
	tool_name: 'mcp__github__create_pull_request',
	tool_input: { title: 'x' },
	tool_response: { html_url: `https://github.com/uyaaaaaa/personal-blog/pull/${number}` },
})

const called = (tool, tool_input) => ({
	hook_event_name: 'PostToolUse',
	tool_name: `mcp__ab-12__${tool}`,
	tool_input,
})

const subscribed = (number = 292) => called('subscribe_pr_activity', { pullNumber: number })
const titled = (number = 292) => called('set_session_title', { title: `PR #${number}` })
const reviewed = (number = 292) =>
	called('create_session', {
		prompt: `review スキルに従って https://github.com/uyaaaaaa/personal-blog/pull/${number} を見る。`,
	})

const stop = () => decide({ hook_event_name: 'Stop' }, store)

beforeEach(() => {
	let kept = null
	store = {
		read: () => kept,
		write: (value) => {
			kept = value
		},
	}
})

describe('decide', () => {
	it('PR を出していないセッションは止めない', () => {
		decide(subscribed(), store)
		expect(stop()).toBeNull()
	})

	it('見届けを飛ばしたまま終わろうとすると、残りを理由に止める', () => {
		decide(opened(), store)

		const reason = stop()
		expect(reason).toMatch('PR #292')
		expect(reason).toMatch('購読')
		expect(reason).toMatch('セッション名')
		expect(reason).toMatch('レビュー用のセッション')
	})

	it('3つを済ませたら止めない', () => {
		decide(opened(), store)
		for (const done of [subscribed(), titled(), reviewed()]) decide(done, store)

		expect(stop()).toBeNull()
	})

	it('残りが減っていれば、また止める', () => {
		decide(opened(), store)
		expect(stop()).toMatch('購読')

		decide(subscribed(), store)
		const reason = stop()
		expect(reason).not.toMatch('購読')
		expect(reason).toMatch('セッション名')
	})

	it('同じ不足では2度目は止めない', () => {
		decide(opened(), store)
		expect(stop()).not.toBeNull()
		expect(stop()).toBeNull()
	})

	it('番号に触れただけの呼び出しは数えない', () => {
		decide(opened(), store)
		decide(called('create_session', { prompt: 'PR #292 の CI を直す' }), store)
		decide(called('set_session_title', { title: '292 を見る' }), store)

		const reason = stop()
		expect(reason).toMatch('レビュー用のセッション')
		expect(reason).toMatch('セッション名')
	})

	it('別の PR に向けた呼び出しは数えない', () => {
		decide(opened(292), store)
		for (const other of [subscribed(300), titled(300), reviewed(300)]) decide(other, store)

		expect(stop()).toMatch('PR #292')
	})

	it('PR ごとに数える', () => {
		decide(opened(292), store)
		decide(opened(300), store)
		for (const done of [subscribed(292), titled(292), reviewed(292)]) decide(done, store)

		const reason = stop()
		expect(reason).toMatch('PR #300')
		expect(reason).not.toMatch('PR #292')
	})
})
