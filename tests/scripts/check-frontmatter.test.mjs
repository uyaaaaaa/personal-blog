import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
})

const write = (name, ...lines) => {
	const path = join(root, 'content/article', name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, `---\n${lines.join('\n')}\n---\n\n## 見出し\n`)
}

const article = (...overrides) => [...VALID, ...overrides]

const without = (key) => VALID.filter((line) => !line.startsWith(`${key}:`))

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

describe('check-frontmatter', () => {
	it('スキーマに合うフロントマターを通す', () => {
		write('a.md', ...article())
		write('b.md', ...article('emoji: "📘"', 'image: "/og/b.png"', 'tags:', '  - nuxt'))
		expect(check().status).toBe(0)
	})

	it('スキーマに無いキーを落とす', () => {
		write('a.md', ...article('author: "uya"'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/a\.md/)
	})

	it('必須のキーが欠けたものを落とす', () => {
		write('a.md', ...without('description'))
		expect(check().status).toBe(1)
	})

	it('型と綴りが合わないものを落とす', () => {
		write('a.md', ...without('published'), 'published: "true"')
		expect(check().status).toBe(1)

		write('a.md', ...without('date'), 'date: 2026-1-30')
		expect(check().status).toBe(1)

		write('a.md', ...without('category'), 'category: diary')
		expect(check().status).toBe(1)
	})

	it('下の階層の記事も見て、Markdown でないファイルは見ない', () => {
		write('draft/a.md', ...article('author: "uya"'))
		expect(check().status).toBe(1)

		rmSync(join(root, 'content/article/draft'), { recursive: true })
		writeFileSync(join(root, 'content/article/a.txt'), '---\nauthor: "uya"\n---\n')
		expect(check().status).toBe(0)
	})
})
