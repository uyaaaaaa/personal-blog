import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { articleRoutes, digestRoutes } from '../../scripts/content-routes.mjs'
import { ARTICLE, DIGEST } from '../../content.collections.mjs'

const ARTICLE_TABLE = `_content_${ARTICLE}`
const DIGEST_TABLE = `_content_${DIGEST}`

let root
let file

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'content-routes-'))
	file = join(root, 'contents.sqlite')
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const seed = (rows) => {
	const db = new Database(file)
	db.exec(`CREATE TABLE ${ARTICLE_TABLE} (path TEXT, published INTEGER)`)
	const insert = db.prepare(`INSERT INTO ${ARTICLE_TABLE} VALUES (?, ?)`)
	for (const [path, published] of rows) insert.run(path, published)
	db.close()
}

const seedDigest = (paths) => {
	const db = new Database(file)
	db.exec(`CREATE TABLE ${DIGEST_TABLE} (path TEXT)`)
	const insert = db.prepare(`INSERT INTO ${DIGEST_TABLE} VALUES (?)`)
	for (const path of paths) insert.run(path)
	db.close()
}

describe('articleRoutes', () => {
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

describe('digestRoutes', () => {
	it('収集物を、collection が持つ綴りのまま返す', () => {
		seedDigest(['/digest/2026-09-21/afternoon', '/digest/2026-09-20/morning'])
		expect(digestRoutes(file)).toEqual([
			'/digest/2026-09-20/morning',
			'/digest/2026-09-21/afternoon',
		])
	})

	it('収集物が0件でも落ちない', () => {
		seedDigest([])
		expect(digestRoutes(file)).toEqual([])
	})

	it('DB が無ければ理由を出して落ちる', () => {
		expect(() => digestRoutes(file)).toThrow(/収集したもののパスを読めない/)
	})

	it('collection のテーブルが無ければ理由を出して落ちる', () => {
		new Database(file).close()
		expect(() => digestRoutes(file)).toThrow(/収集したもののパスを読めない/)
	})
})
