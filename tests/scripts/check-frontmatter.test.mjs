import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { check as run } from '~~/scripts/check-frontmatter.mjs'
import { inProcess } from './inProcess.test-helper.mjs'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-frontmatter.mjs', import.meta.url))

const VALID = [
	'title: "テスト"',
	'description: ""',
	'published: true',
	'date: 2026-01-30',
	'category: blog',
]

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-frontmatter-'))
	mkdirSync(join(root, 'content/article'), { recursive: true })
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
	rmSync(`${root}.md`, { force: true })
})

const write = (name, ...lines) => {
	const path = join(root, 'content/article', name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, `---\n${lines.join('\n')}\n---\n\n## 見出し\n`)
}

const article = (...overrides) => [...VALID, ...overrides]

const without = (key) => VALID.filter((line) => !line.startsWith(`${key}:`))

const check = () => inProcess(run, root)

describe('check-frontmatter', () => {
	it('スキーマに合うフロントマターを通す', async () => {
		write('a.md', ...article())
		write('b.md', ...article('tags:', '  - nuxt'))
		expect((await check()).status).toBe(0)
	})

	it('絵文字やサムネイルを宣言したものを落とす', async () => {
		write('a.md', ...article('emoji: "📘"'))
		expect((await check()).status).toBe(1)

		write('a.md', ...article('image: "/og/a.png"'))
		expect((await check()).status).toBe(1)
	})

	it('スキーマに無いキーを落とす', async () => {
		write('a.md', ...article('author: "uya"'))
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/a\.md/)
	})

	it('必須のキーが欠けたものを落とす', async () => {
		write('a.md', ...without('description'))
		expect((await check()).status).toBe(1)
	})

	it('型と綴りが合わないものを落とす', async () => {
		write('a.md', ...without('published'), 'published: "true"')
		expect((await check()).status).toBe(1)

		write('a.md', ...without('date'), 'date: 2026-1-30')
		expect((await check()).status).toBe(1)

		write('a.md', ...without('category'), 'category: diary')
		expect((await check()).status).toBe(1)
	})

	it.each([
		['重複したキー', ['published: false']],
		['タブで字下げした行', ['tags:', '\t- nuxt']],
	])('%s を、復元された値で通さずに落とす', async (_, lines) => {
		write('a.md', ...article(...lines))
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/YAML として読めない/)
		expect(stderr).toMatch(/a\.md/)
	})

	it('symlink で置いた記事も見る', async () => {
		writeFileSync(`${root}.md`, `---\n${article('author: "uya"').join('\n')}\n---\n`)
		symlinkSync(`${root}.md`, join(root, 'content/article/a.md'))
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/a\.md/)
	})

	it('実体の無い symlink は理由を出して落とす', async () => {
		symlinkSync(`${root}.md`, join(root, 'content/article/a.md'))
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/a\.md を読み取れない/)
		expect(stderr).not.toMatch(/at readFileSync/)
	})

	it('下の階層に置いた記事を、スキーマに合っていても落とす', async () => {
		write('draft/a.md', ...article())
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/直下に置く/)
		expect(stderr).toMatch(/draft\/a\.md/)
	})

	it('記事のディレクトリが無いときは理由を出す', async () => {
		rmSync(join(root, 'content/article'), { recursive: true })
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/content\/article\/ を読み取れない/)
	})

	it('Markdown でないファイルは見ない', async () => {
		writeFileSync(join(root, 'content/article/a.txt'), '---\nauthor: "uya"\n---\n')
		expect((await check()).status).toBe(0)
	})

	it('CLI として引数のディレクトリを見て、落ちれば終了コード 1 を返す', () => {
		write('a.md', ...article('author: "uya"'))
		const { status, stderr } = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })
		expect(status).toBe(1)
		expect(stderr).toMatch(/a\.md/)
	})
})
