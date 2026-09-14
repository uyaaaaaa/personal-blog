import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const MODULE = new URL('../../scripts/stdin.mjs', import.meta.url)

// 標準入力は 64 KiB ずつ届く。境目に多バイト文字が来る入力を作って通す
const CHUNK = 65536
const straddling = () => `${'x'.repeat(CHUNK - 1)}確認\n`

const piped = (input) =>
	execFileSync(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`import { read } from '${MODULE.href}'\nprocess.stdout.write(await read())`,
		],
		{ input, encoding: 'utf8' },
	)

describe('read', () => {
	it('読み取りの境目に多バイト文字が来ても、そのまま返す', () => {
		const input = straddling()
		expect(piped(input)).toBe(input)
	})
})
