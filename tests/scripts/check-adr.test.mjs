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

	it('NN- で始まらないファイル名を落とす', () => {
		adr('third.md', '三つ目の判断')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ファイル名が NN-<英語スラッグ>\.md ではない/)
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
		adr('02-second.md', '次の判断')
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

	it('ADR の無い行を落とす', () => {
		index(
			row('01', '最初の判断', '01-first.md'),
			row('02', '次の判断', '02-second.md'),
			row('03', '消した判断', '03-removed.md'),
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/03-removed\.md を指す行があるが、その ADR が無い/)
	})

	it('番号の順に並んでいない索引を落とす', () => {
		index(row('02', '次の判断', '02-second.md'), row('01', '最初の判断', '01-first.md'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/1行目は 02-second\.md を指している/)
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
