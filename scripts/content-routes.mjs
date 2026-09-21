import Database from 'better-sqlite3'
import { ARTICLE, DIGEST } from '../content.collections.mjs'

const ARTICLE_TABLE = `_content_${ARTICLE}`
const DIGEST_TABLE = `_content_${DIGEST}`

// パスは @nuxt/content が slugify して決める。ファイル名から組み直すと綴りが割れるので、
// ビルド時に組み上がった collection の DB をそのまま読む
const paths = (databaseFile, table, what, condition) => {
	const where = condition === undefined ? '' : ` WHERE ${condition}`
	let db
	try {
		db = new Database(databaseFile, { readonly: true, fileMustExist: true })
		return db
			.prepare(`SELECT path FROM ${table}${where} ORDER BY path`)
			.all()
			.map((row) => row.path)
	} catch (error) {
		throw new Error(`${table} から${what}のパスを読めない（${databaseFile}）: ${error.message}`)
	} finally {
		db?.close()
	}
}

export const articleRoutes = (databaseFile) => {
	const routes = paths(databaseFile, ARTICLE_TABLE, '公開中の記事', 'published = 1')

	if (routes.length === 0)
		throw new Error(`${ARTICLE_TABLE} に公開中の記事が1件も無い（${databaseFile}）`)

	return routes
}

// 収集物は0件から始まるので、記事と違い空を異常にしない
export const digestRoutes = (databaseFile) => paths(databaseFile, DIGEST_TABLE, '収集したもの')
