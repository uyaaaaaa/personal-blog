import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { decide } from '~~/.claude/hooks/pr-followup.mjs'
import { rules, source } from '~~/scripts/review-rules.mjs'

const SOURCE = source(fileURLToPath(new URL('../../../.claude/skills/review', import.meta.url)))
const ROUNDS = rules(SOURCE).rounds

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
const reviewed = (number = 292, workflow_id = 'review.yml', payload = {}) =>
	called('actions_run_trigger', {
		method: 'run_workflow',
		workflow_id,
		inputs: { pr: String(number), review: JSON.stringify(payload) },
	})

const approved = (number = 292) => reviewed(number, 'review.yml', { event: 'APPROVE' })
const changes = (number = 292) =>
	reviewed(number, 'review.yml', { event: 'REQUEST_CHANGES', body: '**判定: Request changes**' })

const ran = (number = 292, workflow = 'review.yml') => ({
	hook_event_name: 'PostToolUse',
	tool_name: 'Bash',
	tool_input: { command: `gh workflow run ${workflow} -f pr=${number} -F review=@/tmp/it.json` },
})

const followed = (number = 292, ...events) => {
	decide(opened(number), store)
	for (const done of [subscribed(number), titled(number), ...events]) decide(done, store)
}

const stop = (ask) => decide({ hook_event_name: 'Stop' }, store, ask)

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
		expect(reason).toMatch('レビューのエージェント')
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

	it('番号に触れただけの呼び出しと、別のワークフローの発火は数えない', () => {
		decide(opened(), store)
		decide(reviewed(292, 'deploy.yml'), store)
		decide(called('set_session_title', { title: '292 を見る' }), store)

		const reason = stop()
		expect(reason).toMatch('レビューのエージェント')
		expect(reason).toMatch('セッション名')
	})

	it('別の PR に向けた呼び出しは数えない', () => {
		decide(opened(292), store)
		for (const other of [subscribed(300), titled(300), reviewed(300)]) decide(other, store)

		expect(stop()).toMatch('PR #292')
	})

	it('投稿先の名前は review スキルから引く', () => {
		const ask = { skill: () => '"workflow_id": "shipit.yml"' }
		decide(opened(), store)
		for (const done of [subscribed(), titled()]) decide(done, store, ask)
		decide(reviewed(292, 'review.yml'), store, ask)

		expect(stop()).toMatch('Review ワークフロー')
	})

	it('スキルが指す名前の発火なら数える', () => {
		const ask = { skill: () => '"workflow_id": "shipit.yml"' }
		decide(opened(), store)
		for (const done of [subscribed(), titled()]) decide(done, store, ask)
		decide(reviewed(292, 'shipit.yml'), store, ask)

		expect(stop()).toBeNull()
	})

	it('gh workflow run で出した発火も数える', () => {
		decide(opened(), store)
		for (const done of [subscribed(), titled(), ran()]) decide(done, store)

		expect(stop()).toBeNull()
	})

	it('別の PR に向けた gh workflow run は数えない', () => {
		decide(opened(292), store)
		for (const done of [subscribed(), titled(), ran(300)]) decide(done, store)

		expect(stop()).toMatch('Review ワークフロー')
	})

	it('スキルを読めない回でも発火を数える', () => {
		const ask = {
			skill: () => {
				throw new Error('読めない')
			},
		}
		decide(opened(), store)
		for (const done of [subscribed(), titled(), reviewed()]) decide(done, store, ask)

		expect(stop()).toBeNull()
	})

	it('落ちた呼び出しは数えない', () => {
		decide(opened(), store)
		for (const done of [subscribed(), titled()]) decide(done, store)
		decide({ ...reviewed(), tool_response: { isError: true } }, store)

		expect(stop()).toMatch('Review ワークフロー')
	})

	it('判定が Approve でなければ、3つを済ませても止める', () => {
		followed(292, changes())

		const reason = stop()
		expect(reason).toMatch('PR #292')
		expect(reason).toMatch('REQUEST_CHANGES')
		expect(reason).toMatch('起こし直す')
	})

	it('起こし直した判定が Approve なら止めない', () => {
		followed(292, changes())
		expect(stop()).not.toBeNull()

		decide(approved(), store)
		expect(stop()).toBeNull()
	})

	it('同じ判定では2度目は止めないが、出し直せばまた止める', () => {
		followed(292, changes())
		expect(stop()).not.toBeNull()
		expect(stop()).toBeNull()

		decide(changes(), store)
		expect(stop()).toMatch('REQUEST_CHANGES')
	})

	it('打ち切りの回数に達したら止めない', () => {
		followed(292, changes())
		for (let round = 0; round < ROUNDS; round += 1) {
			expect(stop()).not.toBeNull()
			decide(changes(), store)
		}

		expect(stop()).toBeNull()
	})

	it('判定を読めなかった回も打ち切りに数える', () => {
		followed(292, changes())
		for (let round = 0; round < ROUNDS; round += 1) {
			expect(stop()).not.toBeNull()
			decide(reviewed(), store)
		}

		expect(stop()).toBeNull()
	})

	it('Approve の名前は review スキルから引く', () => {
		const ask = { skill: () => SOURCE.replace(/`Approve`/g, '`Ship it`') }
		decide(opened(292), store)
		for (const done of [subscribed(), titled()]) decide(done, store, ask)
		decide(reviewed(292, 'review.yml', { event: 'SHIP_IT' }), store, ask)

		expect(stop(ask)).toBeNull()
	})

	it('スキルに無い名前の判定では止める', () => {
		const ask = { skill: () => SOURCE.replace(/`Approve`/g, '`Ship it`') }
		decide(opened(292), store)
		for (const done of [subscribed(), titled()]) decide(done, store, ask)
		decide(approved(), store, ask)

		expect(stop(ask)).toMatch('APPROVE')
	})

	it('判定を読めない発火では止めない', () => {
		followed(292, reviewed())

		expect(stop()).toBeNull()
	})

	it('gh workflow run は渡したファイルから判定を読む', () => {
		const ask = { payload: () => JSON.stringify({ event: 'REQUEST_CHANGES' }) }
		decide(opened(292), store)
		for (const done of [subscribed(), titled(), ran()]) decide(done, store, ask)

		expect(stop()).toMatch('REQUEST_CHANGES')
	})

	it('ファイルを読めない発火では止めない', () => {
		const ask = {
			payload: () => {
				throw new Error('読めない')
			},
		}
		decide(opened(292), store)
		for (const done of [subscribed(), titled(), ran()]) decide(done, store, ask)

		expect(stop()).toBeNull()
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
