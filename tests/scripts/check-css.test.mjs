import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { check as run } from '~~/scripts/check-css.mjs'
import { inProcess } from './inProcess.test-helper.mjs'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-css.mjs', import.meta.url))

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-css-'))
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const write = (name, source) => {
	const path = join(root, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, source)
}

const check = () => inProcess(run, root)

describe('check-css', () => {
	it('語彙とトークンで書いた CSS を通す', async () => {
		write(
			'a.css',
			'.a {\n\tcolor: var(--color-ink);\n\tfont-family: var(--font-mono);\n\tpadding: 0.75rem;\n}\n',
		)
		expect((await check()).status).toBe(0)
	})

	it('書体の名前を落とす', async () => {
		write('a.css', ".a {\n\tfont-family: 'Comic Sans MS';\n}\n")
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/書体の名前/)
	})

	it('@font-face と @import を落とす', async () => {
		write(
			'a.css',
			"@import url('https://example.com/x.css');\n@font-face {\n\tsrc: url('/x.woff2');\n}\n",
		)
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/Web フォントを読み込まない/)
		expect(stderr).toMatch(/@import を書かない/)
	})

	it('display で消す宣言を落とす', async () => {
		write('a.css', '.a {\n\tdisplay: none;\n}\n')
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/display: none を宣言に書かない/)
	})

	it('並べ方の display は通す', async () => {
		write('a.css', '.a {\n\tdisplay: grid;\n}\n')
		expect((await check()).status).toBe(0)
	})

	it('用途に決めた長さでないモーションを落とす', async () => {
		write('a.css', '.a {\n\ttransition: color 0.42s;\n}\n')
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/決めた長さではない/)
	})

	it('用途に決めた長さのモーションは通す', async () => {
		write(
			'a.css',
			'.a {\n\ttransition: color 0.15s var(--ease-change);\n\tanimation: spin 0.2s var(--ease-change);\n}\n',
		)
		expect((await check()).status).toBe(0)
	})

	it('大文字の綴りと、入れ子にした at-rule も落とす', async () => {
		write(
			'a.css',
			"@media (min-width: 768px) {\n\t@FONT-FACE {\n\t\tsrc: url('/x.woff2');\n\t}\n}\n",
		)
		expect((await check()).status).toBe(1)
	})

	it('前処理なしで読まれる別の綴りも見る', async () => {
		write('a.pcss', "@import '@fontsource/inter/index.css';\n")
		expect((await check()).status).toBe(1)
	})

	it('CSS でないファイルと、スキップする階層は見ない', async () => {
		write('node_modules/x/a.css', "@font-face {\n\tsrc: url('/x.woff2');\n}\n")
		write('a.txt', "@font-face {\n\tsrc: url('/x.woff2');\n}\n")
		expect((await check()).status).toBe(0)
	})
	it('CLI として引数のディレクトリを見て、落ちれば終了コード 1 を返す', () => {
		write('a.css', ".a {\n\tfont-family: 'Comic Sans MS';\n}\n")
		const { status, stderr } = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })
		expect(status).toBe(1)
		expect(stderr).toMatch(/書体の名前/)
	})
})
