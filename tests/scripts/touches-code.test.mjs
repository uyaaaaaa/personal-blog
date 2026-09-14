import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/touches-code.mjs', import.meta.url))
const WORKFLOWS = fileURLToPath(new URL('../../.github/workflows', import.meta.url))

const ARTICLE = 'content'
const CODE_WORKFLOWS = ['lint.yml', 'test.yml', 'typecheck.yml']

let repo

afterEach(() => {
	if (repo) rmSync(repo, { recursive: true, force: true })
	repo = undefined
})

const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'pipe' })

const write = (path, body) => {
	mkdirSync(dirname(join(repo, path)), { recursive: true })
	writeFileSync(join(repo, path), body)
}

const started = () => {
	repo = mkdtempSync(join(tmpdir(), 'touches-code-'))
	git('init', '--quiet')
	git('config', 'user.email', 'test@example.com')
	git('config', 'user.name', 'test')
	write(`${ARTICLE}/article/one.md`, '---\ntitle: 記事\n---\n')
	write('app/utils/one.ts', 'export const one = 1\n')
	git('add', '.')
	git('commit', '--quiet', '--no-verify', '-m', '土台を置く')
}

const touchesCode = (stage) => {
	started()
	stage()
	git('add', '--all')
	return spawnSync('node', [SCRIPT], { cwd: repo, stdio: 'pipe' }).status === 0
}

const source = (name) => readFileSync(join(WORKFLOWS, name), 'utf8')
const filters = (name) => [...source(name).matchAll(/paths(?:-ignore)?:\s*\['([^']+)'\]/g)]

describe('変更されたパスの振り分け', () => {
	it('記事だけを変えたコミットはコードに触っていないと見る', () => {
		expect(
			touchesCode(() => write(`${ARTICLE}/article/one.md`, '---\ntitle: 直す\n---\n')),
		).toBe(false)
		expect(
			touchesCode(() => write(`${ARTICLE}/article/two.md`, '---\ntitle: 足す\n---\n')),
		).toBe(false)
		expect(touchesCode(() => rmSync(join(repo, `${ARTICLE}/article/one.md`)))).toBe(false)
	})

	it('コードを含むコミットはコードに触っていると見る', () => {
		expect(touchesCode(() => write('app/utils/one.ts', 'export const one = 2\n'))).toBe(true)
		expect(
			touchesCode(() => {
				write('app/utils/one.ts', 'export const one = 2\n')
				write(`${ARTICLE}/article/one.md`, '---\ntitle: 直す\n---\n')
			}),
		).toBe(true)
	})

	it('記事へ移して消えたコードも見る', () => {
		expect(touchesCode(() => git('mv', 'app/utils/one.ts', `${ARTICLE}/article/one.ts`))).toBe(
			true,
		)
	})

	it('変更が1つも取れないときは検査を回す側に倒す', () => {
		expect(touchesCode(() => {})).toBe(true)
	})
})

describe('workflow の振り分け', () => {
	it('コードのための workflow は pull_request と push の両方で記事を外す', () => {
		for (const name of CODE_WORKFLOWS) {
			expect(filters(name).map(([, glob]) => glob)).toEqual([
				`${ARTICLE}/**`,
				`${ARTICLE}/**`,
			])
		}
	})

	it('記事の検査はパスで絞らない', () => {
		expect(filters('article.yml')).toEqual([])
	})
})
