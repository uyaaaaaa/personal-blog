import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const MODULE = new URL('../../scripts/check-io.mjs', import.meta.url)

const run = (body) =>
	spawnSync(
		process.execPath,
		['--input-type=module', '-e', `import { inputs, loaded } from '${MODULE.href}'\n${body}`],
		{ encoding: 'utf8' },
	)

describe('読めない入力', () => {
	it.each([
		['ファイル', "inputs('/nope').read('a.md')", /^a\.md を読み取れない:\n {2}\S/],
		['ディレクトリ', "inputs('/nope').entries('docs')", /^docs\/ を読み取れない:\n {2}\S/],
		['JSON', "inputs().json('README.md')", /^README\.md を JSON として読めない:\n {2}\S/],
		['モジュール', "await inputs('/nope').load('a.mjs')", /^a\.mjs を読み取れない:\n {2}\S/],
		['パッケージ', "await loaded('@nope/x', 'テーマ x')", /^テーマ x を読み取れない:\n {2}\S/],
	])('%s は、何をなぜ読めないかの1行を出して落ちる', (_, body, expected) => {
		const { status, stderr } = run(body)
		expect(status).toBe(1)
		expect(stderr).toMatch(expected)
		// スタックが出るなら、理由の1行ではなく素の例外が届いている
		expect(stderr).not.toMatch(/\n {4}at /)
	})

	it('読める入力では落ちない', () => {
		expect(run("inputs().read('README.md')").status).toBe(0)
	})
})
