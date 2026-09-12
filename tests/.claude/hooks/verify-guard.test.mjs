import { describe, expect, it } from 'vitest'
import { decide } from '~~/.claude/hooks/verify-guard.mjs'

const idle = { devUp: () => false }
const serving = { devUp: () => true }

const bash = (command, rest = {}) => ({ tool_name: 'Bash', tool_input: { command }, ...rest })

describe('decide', () => {
	it('証跡の残らない実測を止める', () => {
		expect(decide(bash('npm run lint'), idle)).toMatch('証跡が残らない')
		expect(decide(bash('npm test'), idle)).toMatch('証跡が残らない')
		expect(decide(bash('npm run build'), idle)).toMatch('証跡が残らない')
		expect(decide(bash('npm run generate'), idle)).toMatch('証跡が残らない')
	})

	it('証跡に落としていれば通す', () => {
		expect(decide(bash('npm run lint > .verify/lint.log 2>&1; echo $?'), idle)).toBeNull()
		expect(decide(bash('npm test 2>&1 | tee .verify/test.log'), idle)).toBeNull()
	})

	it('同じ行に証跡が無ければ、別の行に証跡があっても止める', () => {
		expect(decide(bash('npm run build && cat .verify/lint.log'), idle)).toMatch('証跡')
	})

	it('引用とヒアドキュメントの本文はコマンドとして読まない', () => {
		expect(decide(bash('git commit -m "まず npm test を通す"'), idle)).toBeNull()
		expect(decide(bash('cat > x.md <<EOF\nnpm test は CI が打つ\nEOF'), idle)).toBeNull()
		expect(decide(bash('echo npm test'), idle)).toBeNull()
	})

	it('npm のオプションを跨いでスクリプト名を見る', () => {
		expect(decide(bash('npm run -s lint'), idle)).toMatch('証跡が残らない')
		expect(decide(bash('npm run lint -- --fix > .verify/lint.log 2>&1'), idle)).toBeNull()
	})

	it('dev が動いている間は、証跡に落としていても止める', () => {
		expect(decide(bash('npm run build > .verify/build.log 2>&1'), serving)).toMatch('dev')
	})

	it('測らないコマンドは dev が動いていても通す', () => {
		expect(decide(bash('npm ci'), serving)).toBeNull()
		expect(decide(bash('npm run dev > .verify/dev.log 2>&1 &'), serving)).toBeNull()
		expect(decide(bash('node scripts/overlay-probe.mjs search'), serving)).toBeNull()
	})

	it('証跡を消せるのは本体だけ', () => {
		expect(decide(bash('rm -rf .verify && mkdir .verify'), idle)).toBeNull()
		expect(decide(bash('rm -rf .verify', { agent_id: 'x' }), idle)).toMatch('投げた側')
		expect(decide(bash('rm -rf .nuxt', { agent_id: 'x' }), idle)).toBeNull()
	})

	it('Bash 以外は見ない', () => {
		expect(
			decide({ tool_name: 'Read', tool_input: { file_path: 'npm run lint' } }, idle),
		).toBeNull()
		expect(decide(bash(undefined), idle)).toBeNull()
	})
})
