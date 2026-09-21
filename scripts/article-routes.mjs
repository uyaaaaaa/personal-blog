import Database from 'better-sqlite3'
import { ARTICLE } from '../content.collections.mjs'

const TABLE = `_content_${ARTICLE}`

// パスは @nuxt/content が slugify して決める。ファイル名から組み直すと綴りが割れるので、
// ビルド時に組み上がった collection の DB をそのまま読む
export const articleRoutes = (databaseFile) => {
	let db
	let routes
	try {
		db = new Database(databaseFile, { readonly: true, fileMustExist: true })
		routes = db
			.prepare(`SELECT path FROM ${TABLE} WHERE published = 1 ORDER BY path`)
			.all()
			.map((row) => row.path)
	} catch (error) {
		throw new Error(
			`${TABLE} から公開中の記事のパスを読めない（${databaseFile}）: ${error.message}`,
		)
	} finally {
		db?.close()
	}

	// 0件は空の起点として通り、出ていないページの検出も素通りする。
	// このPRが塞いだ「黙って消える」経路が、起点の側に戻る
	if (routes.length === 0)
		throw new Error(`${TABLE} に公開中の記事が1件も無い（${databaseFile}）`)

	return routes
}
