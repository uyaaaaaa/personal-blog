import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('./check-css.mjs', import.meta.url))

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

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

describe('check-css', () => {
	it('読み込みを持たない CSS を通す', () => {
		write('a.css', '.a {\n\tcolor: red;\n}\n')
		expect(check().status).toBe(0)
	})

	it('@font-face と @import を落とす', () => {
		write(
			'a.css',
			"@import url('https://example.com/x.css');\n@font-face {\n\tsrc: url('/x.woff2');\n}\n",
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/Web フォントを読み込まない/)
		expect(stderr).toMatch(/@import を書かない/)
	})

	it('大文字の綴りと、入れ子にした at-rule も落とす', () => {
		write(
			'a.css',
			"@media (min-width: 768px) {\n\t@FONT-FACE {\n\t\tsrc: url('/x.woff2');\n\t}\n}\n",
		)
		expect(check().status).toBe(1)
	})

	it('前処理なしで読まれる別の綴りも見る', () => {
		write('a.pcss', "@import '@fontsource/inter/index.css';\n")
		expect(check().status).toBe(1)
	})

	it('CSS でないファイルと、スキップする階層は見ない', () => {
		write('node_modules/x/a.css', "@font-face {\n\tsrc: url('/x.woff2');\n}\n")
		write('a.txt', "@font-face {\n\tsrc: url('/x.woff2');\n}\n")
		expect(check().status).toBe(0)
	})
})
