import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { state } from '~~/.claude/hooks/state.mjs'

const MODULE = new URL('../../../.claude/hooks/state.mjs', import.meta.url).href

let root

// hook は呼び出しごとに別プロセスで起きる。跨いで持てることを同じ形で測る
const inAnotherProcess = (source) =>
	execFileSync(process.execPath, ['--input-type=module', '-e', source], {
		env: { ...process.env, CLAUDE_HOOK_STATE_DIR: root },
		encoding: 'utf8',
	})

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'hook-state-'))
	process.env.CLAUDE_HOOK_STATE_DIR = root
})

afterEach(() => {
	delete process.env.CLAUDE_HOOK_STATE_DIR
	rmSync(root, { recursive: true, force: true })
})

describe('state', () => {
	it('別のプロセスが書いた状態を読める', () => {
		inAnotherProcess(`import { state } from '${MODULE}'; state('pr').write({ number: 290 })`)
		expect(state('pr').read()).toEqual({ number: 290 })
	})

	it('書いていない状態は null', () => {
		expect(state('pr').read()).toBeNull()
	})

	it('サブエージェントの状態を本体と分ける', () => {
		const input = { session_id: 's1' }
		state('pr', input).write({ number: 290 })
		state('pr', { ...input, agent_id: 'a/1' }).write({ number: 1 })

		expect(state('pr', input).read()).toEqual({ number: 290 })
		expect(state('pr', { ...input, agent_id: 'a/1' }).read()).toEqual({ number: 1 })
	})

	it('前のセッションが書いた状態は読まない', () => {
		state('pr', { session_id: 's1' }).write({ number: 290 })
		expect(state('pr', { session_id: 's2' }).read()).toBeNull()
	})
})
