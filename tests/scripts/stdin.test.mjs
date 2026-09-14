import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ROOT = new URL('../../', import.meta.url)
const MODULE = new URL('scripts/stdin.mjs', ROOT)

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

	it('標準入力を読むのはこのモジュールだけ', () => {
		const found = ['.claude/hooks', 'scripts'].flatMap((directory) =>
			readdirSync(new URL(directory, ROOT))
				.map((name) => `${directory}/${name}`)
				.filter(
					(path) =>
						path.endsWith('.mjs') &&
						new URL(path, ROOT).href !== MODULE.href &&
						readFileSync(new URL(path, ROOT), 'utf8').includes('process.stdin'),
				),
		)
		expect(found).toEqual([])
	})
})
