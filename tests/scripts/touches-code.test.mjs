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

const run = (cwd) => spawnSync('node', [SCRIPT], { cwd, encoding: 'utf8' })

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
	return run(repo).status === 0
}

const committed = (stage) => {
	started()
	stage()
	git('add', '--all')
	git('commit', '--quiet', '--no-verify', '-m', '直す')
	return run(repo).status === 0
}

const pathKeys = (name) =>
	readFileSync(join(WORKFLOWS, name), 'utf8')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.startsWith('paths:') || line.startsWith('paths-ignore:'))

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
})

describe('変更されたパスが取れない回', () => {
	it('--amend は作り直す先のコミットと同じ振り分けになる', () => {
		expect(committed(() => write(`${ARTICLE}/article/one.md`, '---\ntitle: 直す\n---\n'))).toBe(
			false,
		)
		expect(committed(() => write('app/utils/one.ts', 'export const one = 2\n'))).toBe(true)
	})

	it('git が失敗した回は理由を出してコードの検査も回す', () => {
		const outside = run(mkdtempSync(join(tmpdir(), 'touches-code-outside-')))
		expect(outside.status).toBe(0)
		expect(outside.stderr).toMatch('変更されたパスを読み取れない')
	})
})

describe('workflow の振り分け', () => {
	it('コードのための workflow は pull_request と push の両方で記事を外す', () => {
		const ignored = `paths-ignore: ['${ARTICLE}/**']`
		for (const name of CODE_WORKFLOWS) {
			expect(pathKeys(name)).toEqual([ignored, ignored])
		}
	})

	it('記事の検査はパスで絞らない', () => {
		expect(pathKeys('article.yml')).toEqual([])
	})
})
