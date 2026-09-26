import { describe, expect, it, vi } from 'vitest'
import { setup } from '~~/.claude/hooks/session-start.mjs'

const calls = (run) => run.mock.calls.map(([command, args]) => [command, ...args].join(' '))

describe('setup', () => {
	it('hooksPath を揃え、依存があれば install しない', () => {
		const run = vi.fn()
		const report = setup({ has: () => true, run })

		expect(calls(run)).toEqual(['git config core.hooksPath .githooks'])
		expect(report).toBe('core.hooksPath=.githooks、node_modules あり')
	})

	it('依存が無ければ install する', () => {
		const run = vi.fn()
		const report = setup({ has: () => false, run })

		expect(calls(run)).toEqual(['git config core.hooksPath .githooks', 'npm ci'])
		expect(report).toMatch('npm ci 済み')
	})

	it('落ちた側の理由を1行で出し、もう片方は続ける', () => {
		const run = vi.fn((command) => {
			if (command === 'git') throw new Error('not a git repository')
		})
		expect(setup({ has: () => false, run })).toBe(
			'core.hooksPath を設定できない（not a git repository）、npm ci 済み',
		)

		const broken = vi.fn((command) => {
			if (command === 'npm') throw Object.assign(new Error('x'), { stderr: 'ENOENT\nE404' })
		})
		expect(setup({ has: () => false, run: broken })).toMatch('npm ci が落ち')
		expect(setup({ has: () => false, run: broken })).toMatch('E404')
	})
})
