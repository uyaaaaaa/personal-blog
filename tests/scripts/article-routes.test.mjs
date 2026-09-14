import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { articleRoutes } from '../../scripts/article-routes.mjs'

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'article-routes-'))
	mkdirSync(join(root, 'content/article'), { recursive: true })
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const write = (name, published) => {
	writeFileSync(
		join(root, 'content/article', name),
		`---\ntitle: "テスト"\npublished: ${published}\n---\n`,
	)
}

describe('article-routes', () => {
	it('公開中の記事だけを記事のパスにする', () => {
		write('vim.md', true)
		write('php.md', false)
		expect(articleRoutes(root)).toEqual(['/article/vim'])
	})

	it('公開中の記事が無ければ空で返す', () => {
		write('vim.md', false)
		expect(articleRoutes(root)).toEqual([])
	})
})
