import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-tests-mirror.mjs', import.meta.url))

let root

const write = (name, source = '') => {
	const path = join(root, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, source)
}

const lint = (...checks) =>
	write(
		'package.json',
		JSON.stringify({
			scripts: {
				lint: ['prettier --check .', ...checks.map((it) => `node ${it}`)].join(' && '),
			},
		}),
	)

const hook = (name, source) => write(`.githooks/${name}`, `#!/bin/sh\n${source}\n`)

const settings = (...commands) =>
	write(
		'.claude/settings.json',
		JSON.stringify({
			hooks: {
				PreToolUse: [
					{
						matcher: 'Skill',
						hooks: commands.map((command) => ({ type: 'command', command })),
					},
				],
			},
		}),
	)

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-tests-mirror-'))
	lint()
	hook('pre-commit', 'npm run lint')
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('テストから実装', () => {
	it('実装をミラーしたテストを通す', () => {
		write('app/utils/tag.ts')
		write('tests/app/utils/tag.test.ts')
		expect(check().status).toBe(0)
	})

	it('tests/ の外に置いたテストを落とす', () => {
		write('app/utils/tag.ts')
		write('app/utils/tag.test.ts')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/tests\/ に実装の構成をミラーして置く/)
	})

	it('対応する実装が無いテストを落とす', () => {
		write('tests/app/utils/tag.test.ts')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/対応する実装が無い/)
	})

	it('.spec. の綴りも、コンポーネントの .vue も見る', () => {
		write('tests/app/utils/tag.spec.ts')
		expect(check().status).toBe(1)

		write('app/components/ui/Pagination.vue')
		write('tests/app/components/ui/Pagination.test.ts')
		expect(check().status).toBe(1)

		write('app/utils/tag.ts')
		expect(check().status).toBe(0)
	})

	it('ハイフンで名乗る設定ファイルのテストを通す', () => {
		write('eslint.config.mjs')
		write('tests/eslint-config.test.mjs')
		expect(check().status).toBe(0)
	})
})

describe('実装からテスト', () => {
	it('lint に載る検査にテストが無い状態を落とす', () => {
		write('scripts/check-css.mjs')
		lint('scripts/check-css.mjs')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/回している検査に対応するテストが無い/)
		expect(stderr).toMatch(/tests\/scripts\/check-css\.test\.mjs/)
	})

	it('npm run を挟んだ先の検査も見る', () => {
		write('scripts/check-css.mjs')
		write(
			'package.json',
			JSON.stringify({
				scripts: {
					lint: 'npm run lint:checks',
					'lint:checks': 'node scripts/check-css.mjs',
				},
			}),
		)
		expect(check().status).toBe(1)

		write('tests/scripts/check-css.test.mjs')
		expect(check().status).toBe(0)
	})

	it('テストの綴りが .spec. でも通す', () => {
		write('scripts/check-css.mjs')
		write('tests/scripts/check-css.spec.mjs')
		lint('scripts/check-css.mjs')
		expect(check().status).toBe(0)
	})

	it('githook で回す検査にテストが無い状態を落とす', () => {
		write('scripts/check-commit-msg.mjs')
		hook('commit-msg', 'node scripts/check-commit-msg.mjs "$1"')
		expect(check().status).toBe(1)

		write('tests/scripts/check-commit-msg.test.mjs')
		expect(check().status).toBe(0)
	})

	it('テストを持つ検査は通す', () => {
		write('scripts/check-css.mjs')
		write('tests/scripts/check-css.test.mjs')
		lint('scripts/check-css.mjs')
		expect(check().status).toBe(0)
	})

	it('どこからも回していない scripts/ のファイルにはテストを求めない', () => {
		write('scripts/harness-journal.mjs')
		expect(check().status).toBe(0)
	})

	it('lint と githook から回らない npm script は起点にしない', () => {
		write('scripts/overlay-probe.mjs')
		write(
			'package.json',
			JSON.stringify({
				scripts: { lint: 'prettier --check .', probe: 'node scripts/overlay-probe.mjs' },
			}),
		)
		expect(check().status).toBe(0)
	})

	it('Claude の hook にテストが無い状態を落とす', () => {
		write('.claude/hooks/code-review-effort.mjs')
		settings('node "$CLAUDE_PROJECT_DIR/.claude/hooks/code-review-effort.mjs"')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/回している検査に対応するテストが無い/)
		expect(stderr).toMatch(/tests\/\.claude\/hooks\/code-review-effort\.test\.mjs/)

		write('tests/.claude/hooks/code-review-effort.test.mjs')
		expect(check().status).toBe(0)
	})

	it('command のどの綴りからも hook を拾う', () => {
		write('.claude/hooks/a.mjs')
		write('.claude/hooks/b.mjs')
		write('.claude/hooks/c.mjs')
		settings(
			'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/a.mjs"',
			'node $CLAUDE_PROJECT_DIR/.claude/hooks/b.mjs',
			'node .claude/hooks/c.mjs',
		)
		const { stderr } = check()
		for (const name of ['a', 'b', 'c']) expect(stderr).toMatch(`.claude/hooks/${name}.mjs`)
	})

	it('hook から回らない .claude/hooks/ のファイルにはテストを求めない', () => {
		write('.claude/hooks/state.mjs')
		settings()
		expect(check().status).toBe(0)
	})

	it('読めない settings.json は理由の1行を出して落とす', () => {
		write('.claude/settings.json', '{')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/hooks を読めない/)
	})
})
