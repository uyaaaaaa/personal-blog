import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { opened, unfinished } from '~~/.claude/hooks/stop-guard.mjs'

const HOOK = fileURLToPath(new URL('../../../.claude/hooks/stop-guard.mjs', import.meta.url))

const shot = (name, at = 1, bytes = 100) => ({ name, at, bytes })

describe('opened', () => {
	it('証跡の PNG を開いたときだけ、その名前を返す', () => {
		expect(
			opened({ tool_name: 'Read', tool_input: { file_path: '/a/.verify/i-375.png' } }),
		).toBe('i-375.png')
		expect(
			opened({ tool_name: 'Read', tool_input: { file_path: '.verify/lint.log' } }),
		).toBeNull()
		expect(opened({ tool_name: 'Read', tool_input: { file_path: '/a/shot.png' } })).toBeNull()
		expect(
			opened({ tool_name: 'Bash', tool_input: { command: 'cat .verify/i.png' } }),
		).toBeNull()
		expect(opened()).toBeNull()
	})
})

describe('unfinished', () => {
	it('開いていない PNG があれば止める', () => {
		expect(
			unfinished({ shots: [shot('a.png'), shot('b.png')], seen: ['a.png@1'] }),
		).toMatchObject({ kind: 'png', reason: expect.stringContaining('b.png') })
		expect(unfinished({ shots: [shot('a.png')], seen: ['a.png@1'] })).toBeNull()
	})

	it('撮れていない PNG は、開くのではなく撮り直させる', () => {
		expect(unfinished({ shots: [shot('a.png', 1, 0)] })).toMatchObject({ kind: 'empty' })
		expect(unfinished({ shots: [shot('a.png', 1, 0)], blocked: ['empty'] })).toBeNull()
	})

	it('撮り直した PNG は開いた扱いにしない', () => {
		expect(unfinished({ shots: [shot('a.png', 2)], seen: ['a.png@1'] })).toMatchObject({
			kind: 'png',
		})
	})

	it('コミットと push を別々に止める', () => {
		expect(unfinished({ dirty: true }).kind).toBe('commit')
		expect(unfinished({ dirty: false, ahead: 2, blocked: ['commit'] }).reason).toMatch('2 件')
		expect(unfinished({})).toBeNull()
	})

	it('PNG・コミット・push の順に、1回ずつ出す', () => {
		const shots = [shot('a.png')]
		expect(unfinished({ shots, dirty: true, ahead: 1 }).kind).toBe('png')
		expect(unfinished({ shots, dirty: true, ahead: 1, blocked: ['png'] }).kind).toBe('commit')
		expect(unfinished({ shots, dirty: true, ahead: 1, blocked: ['png', 'commit'] }).kind).toBe(
			'push',
		)
		expect(
			unfinished({ shots, dirty: true, ahead: 1, blocked: ['png', 'commit', 'push'] }),
		).toBeNull()
	})
})

describe('フックとして打つ', () => {
	const fire = (input, root, store) =>
		execFileSync('node', [HOOK], {
			input: JSON.stringify(input),
			encoding: 'utf8',
			env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_HOOK_STATE_DIR: store },
		})

	it('開いた PNG を覚えていて、次の Stop で止めない', () => {
		const base = mkdtempSync(join(tmpdir(), 'stop-guard-'))
		const root = join(base, 'project')
		const store = join(base, 'state')
		mkdirSync(join(root, '.verify'), { recursive: true })
		writeFileSync(join(root, '.verify', 'index-375-dark.png'), 'x')

		const read = {
			session_id: 'one',
			hook_event_name: 'PostToolUse',
			tool_name: 'Read',
			tool_input: { file_path: '.verify/index-375-dark.png' },
		}
		expect(fire(read, root, store)).toBe('')
		expect(fire({ session_id: 'one', hook_event_name: 'Stop' }, root, store)).toBe('')
		expect(fire({ session_id: 'two', hook_event_name: 'Stop' }, root, store)).toMatch(
			'index-375-dark.png',
		)
	})
})
