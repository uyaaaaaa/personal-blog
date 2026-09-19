import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/touches-code.mjs', import.meta.url))
const WORKFLOWS = fileURLToPath(new URL('../../.github/workflows', import.meta.url))
const GITHOOKS = fileURLToPath(new URL('../../.githooks', import.meta.url))

const ARTICLE = 'content'
const CODE_WORKFLOWS = ['lint.yml', 'test.yml', 'typecheck.yml']
const GATE = 'changes.yml'

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

const run = (cwd, ...range) => spawnSync('node', [SCRIPT, ...range], { cwd, encoding: 'utf8' })

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

const committed = (stage, ...range) => {
	started()
	stage()
	git('add', '--all')
	git('commit', '--quiet', '--no-verify', '-m', '直す')
	return run(repo, ...range).status === 0
}

const linesOf = (directory, name) =>
	readFileSync(join(directory, name), 'utf8')
		.split('\n')
		.map((line) => line.trim())

const lines = (name) => linesOf(WORKFLOWS, name)
const hook = (name) => linesOf(GITHOOKS, name)

const pathKeys = (name) =>
	lines(name).filter((line) => line.startsWith('paths:') || line.startsWith('paths-ignore:'))

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

describe('範囲を渡された回', () => {
	it('2点間の差分で振り分ける', () => {
		expect(
			committed(
				() => write(`${ARTICLE}/article/one.md`, '---\ntitle: 直す\n---\n'),
				'HEAD^',
				'HEAD',
			),
		).toBe(false)
		expect(
			committed(() => write('app/utils/one.ts', 'export const one = 2\n'), 'HEAD^', 'HEAD'),
		).toBe(true)
	})

	it('記事だけの終了コードは、node が落ちたときの 1 と分かれている', () => {
		started()
		write(`${ARTICLE}/article/one.md`, '---\ntitle: 直す\n---\n')
		git('add', '--all')
		git('commit', '--quiet', '--no-verify', '-m', '直す')
		expect(run(repo, 'HEAD^', 'HEAD').status).toBe(2)
	})
})

describe('workflow の振り分け', () => {
	it('どの workflow もパスで絞らない', () => {
		for (const name of [...CODE_WORKFLOWS, 'article.yml']) {
			expect(pathKeys(name)).toEqual([])
		}
	})

	it('コードのための workflow は、記事だけだと判定できた回にジョブを飛ばす', () => {
		for (const name of CODE_WORKFLOWS) {
			expect(lines(name)).toContain(`uses: ./.github/workflows/${GATE}`)
			// needs が無いと outputs.code が空になり、ゲートが開いたままになる
			expect(lines(name)).toContain('needs: changes')
			expect(lines(name)).toContain(
				"if: ${{ !cancelled() && needs.changes.outputs.code != 'false' }}",
			)
		}
	})
})

describe('フックの振り分け', () => {
	it('記事だけの 2 でだけ飛ばし、script が落ちた回はコードの検査を回す', () => {
		for (const name of ['pre-commit', 'commit-msg']) {
			expect(hook(name)).not.toContain('if node scripts/touches-code.mjs; then')
			expect(hook(name)).toContain('if [ "$status" -ne 2 ]; then')
		}
	})
})
