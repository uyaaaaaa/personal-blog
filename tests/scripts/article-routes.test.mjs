import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { articleRoutes } from '../../scripts/article-routes.mjs'
import { ARTICLE } from '../../content.collections.mjs'

const TABLE = `_content_${ARTICLE}`

let root
let file

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'article-routes-'))
	file = join(root, 'contents.sqlite')
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const seed = (rows) => {
	const db = new Database(file)
	db.exec(`CREATE TABLE ${TABLE} (path TEXT, published INTEGER)`)
	const insert = db.prepare(`INSERT INTO ${TABLE} VALUES (?, ?)`)
	for (const [path, published] of rows) insert.run(path, published)
	db.close()
}

describe('article-routes', () => {
	it('公開中の記事を、collection が持つ綴りのまま返す', () => {
		seed([
			['/article/vim-folding', 1],
			['/article/s3-to-rds', 1],
		])
		expect(articleRoutes(file)).toEqual(['/article/s3-to-rds', '/article/vim-folding'])
	})

	it('公開していない記事を外す', () => {
		seed([
			['/article/vim-folding', 1],
			['/article/test-articles', 0],
		])
		expect(articleRoutes(file)).toEqual(['/article/vim-folding'])
	})

	it('公開中の記事が1件も無ければ理由を出して落ちる', () => {
		seed([['/article/test-articles', 0]])
		expect(() => articleRoutes(file)).toThrow(/公開中の記事が1件も無い/)
	})

	it('DB が無ければ理由を出して落ちる', () => {
		expect(() => articleRoutes(file)).toThrow(/公開中の記事のパスを読めない/)
	})

	it('collection のテーブルが無ければ理由を出して落ちる', () => {
		new Database(file).close()
		expect(() => articleRoutes(file)).toThrow(/公開中の記事のパスを読めない/)
	})
})
