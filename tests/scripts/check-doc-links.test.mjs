import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-doc-links.mjs', import.meta.url))
const REPO_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/'
const GUIDELINE = `${REPO_URL}docs/DESIGN_GUIDELINE.md`

let root

const write = (name, source) => {
	const path = join(root, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, source)
}

const config = (...messages) =>
	write(
		'eslint.config.mjs',
		`export default ${JSON.stringify([
			{
				rules: {
					'no-restricted-syntax': ['error', ...messages.map((it) => ({ message: it }))],
				},
			},
		])}`,
	)

const guideline = (...lines) =>
	write('docs/DESIGN_GUIDELINE.md', ['# Design Guideline', '', ...lines, ''].join('\n'))

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-doc-links-'))
	guideline('## 原則', '', '値は名前で書く。')
	config(`色の直値は書かない。 ${GUIDELINE}#原則`)
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

it('実在する見出しに着地する案内を通す', () => {
	expect(check().status).toBe(0)
})

it('見出しの消えた案内を落とす', () => {
	guideline('## 守る線', '', '目で確かめる。')
	const { status, stderr } = check()
	expect(status).toBe(1)
	expect(stderr).toMatch(/#原則 に当たる見出しが無い/)
})

it('ファイルの消えた案内を落とす', () => {
	rmSync(join(root, 'docs/DESIGN_GUIDELINE.md'))
	const { status, stderr } = check()
	expect(status).toBe(1)
	expect(stderr).toMatch(/docs\/DESIGN_GUIDELINE\.md が無い/)
})

it('meta.messages に綴られた案内も見る', () => {
	write(
		'eslint.config.mjs',
		`export default [{ plugins: { style: { rules: { token: { meta: { messages: { literal: '色の直値は書かない。 ${GUIDELINE}#無い見出し' } } } } } } }]`,
	)
	const { status, stderr } = check()
	expect(status).toBe(1)
	expect(stderr).toMatch(/#無い見出し に当たる見出しが無い/)
})

it('コードブロックの中の # を見出しに数えない', () => {
	guideline('```sh', '# 原則', '```')
	expect(check().status).toBe(1)
})

it('案内が1つも無い設定を落とす', () => {
	config('色の直値は書かない。')
	const { status, stderr } = check()
	expect(status).toBe(1)
	expect(stderr).toMatch(/案内が1つも無い/)
})
