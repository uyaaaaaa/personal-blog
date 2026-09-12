import { describe, expect, it } from 'vitest'
import { opened, unfinished } from '~~/.claude/hooks/stop-guard.mjs'

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
		expect(unfinished({ shots: ['a.png', 'b.png'], seen: ['a.png'] })).toMatchObject({
			kind: 'png',
			reason: expect.stringContaining('b.png'),
		})
		expect(unfinished({ shots: ['a.png'], seen: ['a.png'] })).toBeNull()
	})

	it('コミットしていない変更と、push していないコミットを止める', () => {
		expect(unfinished({ dirty: true })).toMatchObject({ kind: 'push' })
		expect(unfinished({ ahead: 2 }).reason).toMatch('2 件')
		expect(unfinished({})).toBeNull()
	})

	it('PNG を先に出し、push は次の回に回す', () => {
		expect(unfinished({ shots: ['a.png'], dirty: true }).kind).toBe('png')
		expect(unfinished({ shots: ['a.png'], dirty: true, blocked: ['png'] }).kind).toBe('push')
	})

	it('一度止めた理由では二度止めない', () => {
		expect(unfinished({ shots: ['a.png'], dirty: true, blocked: ['png', 'push'] })).toBeNull()
	})
})
