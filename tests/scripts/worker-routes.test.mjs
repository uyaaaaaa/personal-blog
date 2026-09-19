import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { servedPaths, workerExclude, writeWorkerRoutes } from '../../scripts/worker-routes.mjs'

let dist

beforeEach(() => {
	dist = mkdtempSync(join(tmpdir(), 'worker-routes-'))
})

afterEach(() => {
	rmSync(dist, { recursive: true, force: true })
})

const generate = (...files) => {
	for (const file of files) {
		mkdirSync(join(dist, dirname(file)), { recursive: true })
		writeFileSync(join(dist, file), '')
	}
}

const routes = () => JSON.parse(readFileSync(join(dist, '_routes.json'), 'utf8'))

describe('servedPaths', () => {
	it('index.html と .html を、拡張子を落とした綴りでも数える', () => {
		generate('index.html', 'article/vim/index.html', '404.html')
		expect(servedPaths(dist)).toEqual([
			'/',
			'/404',
			'/404.html',
			'/article/vim',
			'/article/vim/index.html',
			'/index.html',
		])
	})

	it('配信されないファイルを数えない', () => {
		generate('_worker.js/index.js', '_headers', '_redirects', '_routes.json', 'robots.txt')
		expect(servedPaths(dist)).toEqual(['/robots.txt'])
	})
})

describe('workerExclude', () => {
	it('2階層以上のパスを先頭のワイルドカードに畳む', () => {
		expect(workerExclude(['/article/vim', '/article/php', '/tags/nuxt'])).toEqual([
			'/article/*',
			'/tags/*',
		])
	})

	it('直下のパスはそのまま数える', () => {
		expect(workerExclude(['/', '/article', '/robots.txt'])).toEqual([
			'/',
			'/article',
			'/robots.txt',
		])
	})
})

describe('writeWorkerRoutes', () => {
	it('生成された全パスから除外を書き出す', () => {
		generate('index.html', 'article/vim/index.html', '_nuxt/entry.js', 'robots.txt')
		writeWorkerRoutes(dist, ['/article/vim'])
		expect(routes()).toEqual({
			version: 1,
			include: ['/*'],
			exclude: ['/', '/_nuxt/*', '/article/*', '/index.html', '/robots.txt'],
		})
	})

	it('HTML が出ていないページがあれば、そのパスを挙げて落とす', () => {
		generate('index.html', 'article/vim/index.html')
		expect(() => writeWorkerRoutes(dist, ['/article/vim', '/article/php'])).toThrow(
			/\/article\/php/,
		)
	})

	it('除外が Cloudflare の上限を超えたら落とす', () => {
		generate(...Array.from({ length: 100 }, (_, index) => `family-${index}/index.html`))
		expect(() => writeWorkerRoutes(dist, [])).toThrow(/上限 100/)
	})
})
