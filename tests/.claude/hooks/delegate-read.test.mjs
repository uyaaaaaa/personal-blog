import { describe, expect, it } from 'vitest'
import { decide } from '~~/.claude/hooks/delegate-read.mjs'

const big = () => 40000
const small = () => 400

const read = (tool_input) => ({ tool_name: 'Read', tool_input })
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } })

describe('decide', () => {
	it('下限を超えるファイルの丸読みだけを止める', () => {
		expect(decide(read({ file_path: '/a/big.ts' }), big)).toMatch('subagent_type')
		expect(decide(read({ file_path: '/a/small.ts' }), small)).toBeNull()
	})

	it('範囲を絞った読みは通す', () => {
		expect(decide(read({ file_path: '/a/big.ts', offset: 100, limit: 50 }), big)).toBeNull()
	})

	it('引用で受け取れないファイルは通す', () => {
		expect(decide(read({ file_path: '/a/shot.png' }), big)).toBeNull()
	})

	it('読めないファイルは通す', () => {
		expect(decide(read({ file_path: '/a/gone.ts' }), () => null)).toBeNull()
	})

	it('Bash では素の cat だけを止める', () => {
		expect(decide(bash('cat big.ts'), big)).toMatch('subagent_type')
		expect(decide(bash("cat 'a b.ts'"), big)).toMatch('subagent_type')
		expect(decide(bash('cat big.ts | grep foo'), big)).toBeNull()
		expect(decide(bash('head -50 big.ts'), big)).toBeNull()
		expect(decide(bash("sed -n '1,50p' big.ts"), big)).toBeNull()
		expect(decide(bash('cat big.ts > out.txt'), big)).toBeNull()
	})

	it('サブエージェント内では止めない', () => {
		expect(decide({ agent_id: 'x', ...read({ file_path: '/a/big.ts' }) }, big)).toBeNull()
		expect(decide({ agent_id: 'x', ...bash('cat big.ts') }, big)).toBeNull()
	})

	it('読み取り以外のツールは見ない', () => {
		expect(
			decide({ tool_name: 'Edit', tool_input: { file_path: '/a/big.ts' } }, big),
		).toBeNull()
	})
})
