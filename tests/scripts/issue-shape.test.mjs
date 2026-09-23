import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { complete, findings, load, rules } from '~~/scripts/issue-shape.mjs'

const RULES = rules(load())

const body = (sections) =>
	Object.entries(sections)
		.map(([name, lines]) => [`## ${name}`, '', ...lines, ''].join('\n'))
		.join('\n')

const SHAPED = {
	ゴール: ['タグの一覧に他のタグの記事が混ざらない。'],
	現状: ['- 日本語だけのタグで一覧が混ざる', '- 再現は記事2本で揃う'],
	完了条件: ['- [ ] 日本語だけのタグでも一覧が混ざらない', '- [ ] 既存のタグの一覧が変わらない'],
}

const issue = (over = {}) => ({
	title: 'タグの一覧が混ざる',
	body: body(SHAPED),
	labels: ['bug'],
	...over,
})

const found = (over) => findings(issue(over), RULES)

describe('rules', () => {
	it('issue テンプレートから型を読める', () => {
		expect(complete(RULES)).toBe(true)
		expect(RULES.map(({ kind }) => kind)).toEqual(['bug', 'enhancement'])
		for (const form of RULES) {
			expect(
				form.sections.filter(({ required }) => required).map(({ name }) => name),
			).toEqual(['ゴール', '現状', '完了条件'])
			expect(form).toMatchObject({ length: 40, items: 3, oneLine: true })
		}
	})

	it('読めないテンプレートからは判定を組み立てない', () => {
		expect(complete(rules([]))).toBe(false)
		expect(complete(rules([{ labels: ['bug'], body: [] }]))).toBe(false)
	})
})

describe('findings', () => {
	it('型に合う issue には何も出さない', () => {
		expect(found()).toEqual([])
	})

	it('フォームから出た本文を通す', () => {
		const form = [
			'### ゴール',
			'',
			'タグの一覧に他のタグの記事が混ざらない。',
			'',
			'### 現状',
			'',
			'- 日本語だけのタグで一覧が混ざる',
			'',
			'### 完了条件',
			'',
			'- [ ] 日本語だけのタグでも一覧が混ざらない',
			'',
			'### 前提・制約',
			'',
			'_No response_',
		].join('\n')
		expect(found({ body: form, labels: ['enhancement'] })).toEqual([])
	})

	it('任意の節を足しても、順に並んでいれば通す', () => {
		const written = body({
			...SHAPED,
			'前提・制約': ['- `docs/DECISIONS.md` の判断と衝突しない'],
			'手がかり（指示ではない）': ['- `app/utils/category.ts` が正規化している'],
			範囲外: ['- タグの表記ゆれの統合'],
		})
		expect(found({ body: written, labels: ['enhancement'] })).toEqual([])
	})

	it('節は種別のラベルに合うフォームで見る', () => {
		const written = body({ ...SHAPED, 範囲外: ['- タグの表記ゆれの統合'] })
		expect(found({ body: written, labels: ['bug'] })).toContain('型に無い節: ## 範囲外')
	})

	it('欠いた節を名指しで落とす', () => {
		const { 現状: dropped, ...rest } = SHAPED
		expect(found({ body: body(rest) })).toContain('## 現状 が無い')
	})

	it('型に無い節と、節の外の本文を落とす', () => {
		expect(found({ body: body({ ...SHAPED, 実装案: ['- utils に足す'] }) })).toContain(
			'型に無い節: ## 実装案',
		)
		expect(found({ body: `困っている。\n\n${body(SHAPED)}` })).toContain(
			'節の見出しの外に本文がある',
		)
	})

	it('節の順が型と違えば落とす', () => {
		const { ゴール, ...rest } = SHAPED
		expect(found({ body: body({ ...rest, ゴール }) })).toContain(
			`節は ${RULES[0].sections.map(({ name }) => name).join(' → ')} の順に並べる`,
		)
	})

	it('完了条件はチェックリストで書く', () => {
		expect(found({ body: body({ ...SHAPED, 完了条件: ['- 混ざらない'] }) })).toContain(
			'## 完了条件 を - [ ] のチェックリストで書く',
		)
	})

	it('1節の項目数と、2行にまたがる項目を落とす', () => {
		const four = ['- 1', '- 2', '- 3', '- 4']
		expect(found({ body: body({ ...SHAPED, 現状: four }) })).toContain(
			'## 現状 が 4 項目（1節3項目以内）',
		)
		expect(
			found({ body: body({ ...SHAPED, 現状: ['- 一覧が混ざる', '  条件は記事2本'] }) }),
		).toContain('## 現状 の項目が2行にまたがっている')
	})

	it('本文が長すぎれば行数を出して落とす', () => {
		const long = { ...SHAPED, ゴール: Array(40).fill('一覧が混ざらない。') }
		expect(found({ body: body(long) })).toContain('本文が 52 行（40行以内）')
	})

	it('タイトルの接頭辞とラベルを落とす', () => {
		expect(found({ title: 'fix: 一覧が混ざる' })).toContain(
			'タイトルに分類の接頭辞が付いている',
		)
		expect(found({ title: '[bug] 一覧が混ざる' })).toContain(
			'タイトルに分類の接頭辞が付いている',
		)
		expect(found({ labels: ['bug', 'enhancement'] })).toContain(
			'ラベルは bug / enhancement から1つ（今は bug / enhancement）',
		)
		expect(found({ labels: [] })).toContain('ラベルは bug / enhancement から1つ（今はなし）')
	})

	it('種別以外のラベルは問わない', () => {
		expect(found({ labels: ['bug', 'needs-decision', 'good first issue'] })).toEqual([])
	})

	it('欠けた値は空として落とす', () => {
		expect(
			findings({ title: 'タグの一覧が混ざる', body: null, labels: ['bug'] }, RULES),
		).toContain('## ゴール が無い')
		expect(findings({}, RULES).length).toBeGreaterThan(0)
	})
})

// 標準入力は 64 KiB ずつ届く。境目に多バイト文字が来る入力を作って通す
const CHUNK = 65536
const HEADING = '完了条件'

const dump = (filler) =>
	JSON.stringify([
		{
			number: 1,
			title: 'タグの一覧が混ざる',
			body: body({ ...SHAPED, 現状: [`- ${'x'.repeat(filler)}`] }),
			labels: ['bug'],
		},
	])

const straddling = () => {
	for (let filler = CHUNK - 200; filler < CHUNK + 200; filler += 1) {
		const json = dump(filler)
		if (Buffer.from(json).indexOf(Buffer.from(HEADING)) === CHUNK - 1) return json
	}
	throw new Error('境目に見出しが来る入力を作れない')
}

describe('CLI', () => {
	it('読み取りの境目に見出しが来ても、型に合う issue を落とさない', () => {
		const script = fileURLToPath(new URL('../../scripts/issue-shape.mjs', import.meta.url))
		const out = execFileSync('node', [script], { input: straddling(), encoding: 'utf8' })
		expect(out.trim()).toBe('#1 型に合う')
	})
})
