import { describe, expect, it } from 'vitest'
import { decide } from '~~/.claude/hooks/code-review-effort.mjs'

const call = (skill, args) => ({ tool_name: 'Skill', tool_input: { skill, ...(args && { args }) } })

describe('decide', () => {
	it('effort の無い code-review に既定を補う', () => {
		expect(decide(call('code-review'))).toEqual({ skill: 'code-review', args: 'medium' })
		expect(decide(call('code-review', '--fix'))).toEqual({
			skill: 'code-review',
			args: '--fix medium',
		})
	})

	it('effort を渡した呼び出しは触らない', () => {
		expect(decide(call('code-review', 'high'))).toBeNull()
		expect(decide(call('code-review', '--fix MAX'))).toBeNull()
		expect(decide(call('code-review', '--effort=high'))).toBeNull()
	})

	it('他のスキルと他のツールは見ない', () => {
		expect(decide(call('review'))).toBeNull()
		expect(decide({ tool_name: 'Bash', tool_input: { command: 'code-review' } })).toBeNull()
		expect(decide({})).toBeNull()
	})
})
