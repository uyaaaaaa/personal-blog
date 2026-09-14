import { readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Cloudflare は include と exclude を1ルート1件で数え、合計100件を超える _routes.json を受け取らない
const ROUTE_LIMIT = 100

const INCLUDE = ['/*']

// Worker 自身と Pages が読む制御ファイル。配信されないので除外にも数えない
const UNSERVED = new Set(['_worker.js', '_routes.json', '_headers', '_redirects'])

export const servedPaths = (distDir) => {
	const paths = new Set()

	for (const entry of readdirSync(distDir, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile()) continue

		const file = relative(distDir, join(entry.parentPath, entry.name)).split(sep).join('/')
		if (UNSERVED.has(file.split('/')[0])) continue

		paths.add(`/${file}`)
		// Pages は /a/b/index.html を /a/b でも、/404.html を /404 でも返す
		paths.add(
			`/${file
				.replace(/(^|\/)index\.html$/, '$1')
				.replace(/\.html$/, '')
				.replace(/\/$/, '')}`,
		)
	}

	return [...paths].sort()
}

export const workerExclude = (paths) => {
	const excluded = new Set()

	for (const path of paths) {
		const [head, ...rest] = path.split('/').slice(1)
		excluded.add(rest.length > 0 ? `/${head}/*` : path)
	}

	return [...excluded].sort()
}

export const writeWorkerRoutes = (distDir, pages) => {
	const served = new Set(servedPaths(distDir))

	const missing = pages.filter((page) => !served.has(page))
	if (missing.length > 0)
		throw new Error(
			['collection にあるのに HTML が出ていないページがある:', ...missing].join('\n  '),
		)

	const exclude = workerExclude([...served])
	const total = INCLUDE.length + exclude.length
	if (total > ROUTE_LIMIT)
		throw new Error(`_routes.json が Cloudflare の上限 ${ROUTE_LIMIT} を超える: ${total}件`)

	writeFileSync(
		join(distDir, '_routes.json'),
		`${JSON.stringify({ version: 1, include: INCLUDE, exclude }, null, 2)}\n`,
	)

	return exclude
}
