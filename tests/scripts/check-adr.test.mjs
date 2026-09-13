import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-adr.mjs', import.meta.url))
const POINTS = ['検討した案', '対価', '戻す条件']

let root

const write = (name, source) => {
	const path = join(root, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, source)
}

const adr = (file, title, points = POINTS) =>
	write(
		`docs/adr/${file}`,
		[`# ${title}`, '', '理由。', '', ...points.map((it) => `- **${it}**: 中身。`), ''].join(
			'\n',
		),
	)

const index = (...rows) => write('docs/DECISIONS.md', ['# 判断の記録', '', ...rows, ''].join('\n'))

const row = (number, title, file) => `- [${number} ${title}](./adr/${file})`

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-adr-'))
	adr('01-first.md', '最初の判断')
	adr('02-second.md', '次の判断')
	index(row('01', '最初の判断', '01-first.md'), row('02', '次の判断', '02-second.md'))
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

it('番号も索引も書き方も揃った ADR を通す', () => {
	expect(check().status).toBe(0)
})

describe('番号', () => {
	it('飛んだ番号を落とす', () => {
		adr('03-third.md', '三つ目の判断')
		index(
			row('01', '最初の判断', '01-first.md'),
			row('03', '三つ目の判断', '03-third.md'),
			row('02', '次の判断', '02-second.md'),
		)
		rmSync(join(root, 'docs/adr/02-second.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/番号は連番にする/)
	})

	it('重複した番号を落とす', () => {
		adr('02-duplicate.md', '重なった判断')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/番号 02 が2つある/)
	})

	it('NN- で始まらない .md を落とす', () => {
		adr('third.md', '三つ目の判断')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ファイル名が NN-<英語スラッグ>\.md ではない/)
	})

	// 1つ落ちると pre-commit が回す lint ごと止まり、以後どのコミットも通らなくなる
	it('.md ではないファイルを見ない', () => {
		write('docs/adr/.DS_Store', '')
		expect(check().status).toBe(0)
	})
})

describe('書き方', () => {
	it('三点を欠いた ADR を落とす', () => {
		adr('02-second.md', '次の判断', ['検討した案'])
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/対価 \/ 戻す条件 が無い/)
	})

	it('三点の並びが違う ADR を落とす', () => {
		adr('02-second.md', '次の判断', ['対価', '検討した案', '戻す条件'])
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/三点は 検討した案 → 対価 → 戻す条件 の並びで1つずつ置く/)
	})

	it('1行目が見出しでない ADR を落とす', () => {
		write(
			'docs/adr/02-second.md',
			[
				'前書き。',
				'',
				'# 次の判断',
				'',
				...POINTS.map((it) => `- **${it}**: 中身。`),
				'',
			].join('\n'),
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/1行目を判断を言い切る # の見出しにする/)
	})
})

describe('索引', () => {
	it('行の無い ADR を落とす', () => {
		index(row('01', '最初の判断', '01-first.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/02-second\.md の行が無い/)
	})

	// 位置で突き合わせると、余った1行から後ろの実在する ADR まで「無い」と報告される
	it('余った行だけを名指しし、実在する ADR は落とさない', () => {
		index(
			row('01', '最初の判断', '01-first.md'),
			row('03', '消した判断', '03-removed.md'),
			row('02', '次の判断', '02-second.md'),
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/2行目の 03-removed\.md に当たる ADR が無い/)
		expect(stderr).not.toMatch(/02-second\.md の行が無い/)
	})

	it('番号の順に並んでいない索引を落とす', () => {
		index(row('02', '次の判断', '02-second.md'), row('01', '最初の判断', '01-first.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/行は番号の順に並べる/)
	})

	it('同じ ADR を2度引く索引を落とす', () => {
		index(
			row('01', '最初の判断', '01-first.md'),
			row('02', '次の判断', '02-second.md'),
			row('02', '次の判断', '02-second.md'),
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/02-second\.md の行が2つある/)
	})

	it('本文と違う見出しの行を落とす', () => {
		index(row('01', '最初の判断', '01-first.md'), row('02', '別の判断', '02-second.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/見出しが本文と違う/)
	})

	it('ファイル名と違う番号の行を落とす', () => {
		index(row('01', '最初の判断', '01-first.md'), row('03', '次の判断', '02-second.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/行の番号が 03/)
	})
})

describe('リンク', () => {
	it('索引の外から切れたリンクを落とす', () => {
		write('docs/DESIGN_GUIDELINE.md', '色の判断は [ADR 03](./adr/03-removed.md) が持つ。\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/docs\/DESIGN_GUIDELINE\.md:1: \.\/adr\/03-removed\.md の先が無い/)
	})

	it('深い場所からの相対リンクも辿る', () => {
		write('.claude/rules/docs.md', '[ADR 03](../../docs/adr/03-removed.md)\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/\.claude\/rules\/docs\.md:1: .* の先が無い/)
	})

	it('生きたリンクと、ADR を指す外部 URL を通す', () => {
		write(
			'docs/ARCHITECTURE.md',
			[
				'[ADR 01](./adr/01-first.md) と [見出し](./adr/02-second.md#次の判断)。',
				'[issue](https://github.com/uyaaaaaa/personal-blog/blob/main/docs/adr/03-removed.md)',
				'',
			].join('\n'),
		)
		expect(check().status).toBe(0)
	})
})
