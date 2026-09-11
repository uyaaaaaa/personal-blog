import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-frontmatter.mjs', import.meta.url))

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-frontmatter-'))
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const ARTICLE = [
	'---',
	'title: "タイトル"',
	'description: "説明"',
	'published: true',
	'date: "2026-01-01"',
	'category: blog',
	'---',
	'本文\n',
].join('\n')

const write = (name, source = ARTICLE) => {
	const path = join(root, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, source)
}

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

describe('check-frontmatter', () => {
	it('スキーマに合うフロントマターを通す', () => {
		write('a.md')
		expect(check().status).toBe(0)
	})

	it('スキーマに無いキーと欠けたキーを落とす', () => {
		write('a.md', ARTICLE.replace('category: blog', 'unknown: "x"'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/unknown/)
		expect(stderr).toMatch(/category/)
	})

	it('下の階層に置いた記事を落とす', () => {
		write('a.md')
		write('nested/b.md')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/nested\/b\.md/)
	})
})
