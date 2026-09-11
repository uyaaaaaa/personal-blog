import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-tags.mjs', import.meta.url))

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-tags-'))
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
	rmSync(`${root}.md`, { force: true })
})

const frontmatter = (...tags) => `---\ntags:\n${tags.map((tag) => `  - ${tag}\n`).join('')}---\n`

const write = (name, ...tags) => {
	const path = join(root, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, frontmatter(...tags))
}

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

describe('check-tags', () => {
	it('スラッグが重ならないタグを通す', () => {
		write('a.md', 'Nuxt')
		write('b.md', 'TypeScript')
		expect(check().status).toBe(0)
	})

	it('同じスラッグになるタグを落とす', () => {
		write('a.md', 'GitHub Actions')
		write('b.md', 'github-actions')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/同じスラッグ "github-actions"/)
	})

	it('英数字を含まないタグを落とす', () => {
		write('a.md', '設計')
		expect(check().status).toBe(1)
	})

	it('ディレクトリが無いときは理由を出して落とす', () => {
		const { status, stderr } = spawnSync(process.execPath, [SCRIPT, join(root, 'none')], {
			encoding: 'utf8',
		})
		expect(status).toBe(1)
		expect(stderr).toMatch(/記事のディレクトリを読み取れない/)
	})

	it('symlink で置いた記事も見る', () => {
		write('a.md', 'Nuxt')
		writeFileSync(`${root}.md`, frontmatter('nuxt'))
		symlinkSync(`${root}.md`, join(root, 'b.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/同じスラッグ "nuxt"/)
	})

	it('下の階層に置いた記事を落とす', () => {
		write('a.md', 'Nuxt')
		write('nested/b.md', 'nuxt')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/nested\/b\.md/)
	})
})
