import Database from 'better-sqlite3'

const TABLE = '_content_article'

// パスは @nuxt/content が slugify して決める。ファイル名から組み直すと綴りが割れるので、
// ビルド時に組み上がった collection の DB をそのまま読む
export const articleRoutes = (databaseFile) => {
	let db
	try {
		db = new Database(databaseFile, { readonly: true, fileMustExist: true })
		return db
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
}
