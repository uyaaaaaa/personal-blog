import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-tags.mjs', import.meta.url))

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-tags-'))
	mkdirSync(join(root, 'content/article'), { recursive: true })
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
	rmSync(`${root}.md`, { force: true })
})

const write = (name, source) => {
	writeFileSync(join(root, 'content/article', name), source)
}

const withTags = (name, ...tags) => {
	write(name, `---\ntitle: "テスト"\ntags:\n${tags.map((tag) => `  - ${tag}`).join('\n')}\n---\n`)
}

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

describe('check-tags', () => {
	it('スラッグが一意になるタグを通す', () => {
		withTags('a.md', 'nuxt', 'github action', '@nuxt/content')
		withTags('b.md', 'nuxt', 'S3')
		expect(check().status).toBe(0)
	})

	it('同じスラッグになるタグを、持ち主のファイルごと落とす', () => {
		withTags('a.md', 'Nuxt Content')
		withTags('b.md', 'nuxt-content')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/同じスラッグ "nuxt-content"/)
		expect(stderr).toMatch(/a\.md/)
		expect(stderr).toMatch(/b\.md/)
	})

	it('英数字を含まないタグを落とす', () => {
		withTags('a.md', '日本語')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/スラッグが空になる/)
	})

	it('1行で書いた tags を落とす', () => {
		write('a.md', '---\ntitle: "テスト"\ntags: [nuxt, vue]\n---\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/1行1件のリストで書く/)
	})

	it('項目として読めない行を落とす', () => {
		write('a.md', '---\ntitle: "テスト"\ntags:\n  nuxt\n---\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/項目として読めない行がある/)
	})

	it('symlink で置いた記事も見る', () => {
		withTags('a.md', 'Nuxt Content')
		writeFileSync(`${root}.md`, '---\ntitle: "テスト"\ntags:\n  - nuxt-content\n---\n')
		symlinkSync(`${root}.md`, join(root, 'content/article/b.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/同じスラッグ "nuxt-content"/)
	})

	it('下の階層に置いた記事を落とす', () => {
		mkdirSync(join(root, 'content/article/draft'))
		withTags('draft/a.md', 'nuxt')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/直下に置く/)
		expect(stderr).toMatch(/draft\/a\.md/)
	})

	it('記事のディレクトリが無いときは理由を出す', () => {
		rmSync(join(root, 'content/article'), { recursive: true })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/記事のディレクトリを読み取れない/)
	})

	it('tags を持たない記事と、フロントマターの無いファイルは見ない', () => {
		write('a.md', '---\ntitle: "テスト"\n---\n')
		write('b.md', '## 見出しから始まる\n\ntags: [nuxt, vue]\n')
		expect(check().status).toBe(0)
	})
})
