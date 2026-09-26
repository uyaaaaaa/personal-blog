import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { args, findings, verdict } from '~~/scripts/review-args.mjs'
import { rules, source } from '~~/scripts/review-rules.mjs'

const SOURCE = source(fileURLToPath(new URL('../../.claude/skills/review', import.meta.url)))

const RULES = rules(SOURCE)

const comment = (over = {}) => ({
	grade: 'must',
	path: 'app/components/Toc.vue',
	line: 12,
	heading: '静的生成の HTML では閉じたままになる',
	body: '初期状態がビルド時に焼き付く。\nCSS で出し分ける。',
	...over,
})

const review = (over = {}) => ({
	reason: '初期表示が閉じたままになる。',
	verified: '`npm run lint` `npm test` は終了コード 0',
	comments: [comment()],
	...over,
})

const payload = (over) => args(review(over), RULES)

const graded = (...names) => names.map((grade) => comment({ grade }))

describe('verdict', () => {
	it.each([
		[['must', 'nits'], 'Request changes'],
		[['suggestion', 'imo'], 'Comment'],
		[['imo', 'nits'], 'Approve'],
		[[], 'Approve'],
	])('%s は %s になる', (names, name) => {
		expect(verdict(graded(...names), RULES).name).toBe(name)
	})
})

describe('findings', () => {
	it('型に合うレビューには何も出さない', () => {
		expect(findings(review(), RULES)).toEqual([])
	})

	it('上限を超えた件数を落とす', () => {
		const many = (grade, count) => Array.from({ length: count }, () => comment({ grade }))
		expect(findings(review({ comments: many('suggestion', 6) }), RULES)).toEqual([
			'指摘が 6 件（合計5件まで）',
		])
		expect(findings(review({ comments: many('imo', 3) }), RULES)).toEqual([
			'imo と nits が 3 件（合わせて2件まで）',
		])
	})

	it('指摘の形になっていない要素を理由にして落とす', () => {
		expect(findings(review({ comments: [null] }), RULES)).toEqual([
			'1件目: 指摘は { grade, path, line, heading, body } で渡す',
		])
	})

	it('空行とコード片は本文の行数に数えない', () => {
		const spaced = comment({ body: '理由。\n\n代案。' })
		expect(findings(review({ comments: [spaced] }), RULES)).toEqual([])

		const snippet = comment({ body: '理由。\n\n```js\nconst a = 1\nconst b = 2\n```' })
		expect(findings(review({ comments: [snippet] }), RULES)).toEqual([])
	})

	it('コメント1件ごとの欠けと長さを落とす', () => {
		const broken = comment({ grade: 'blocker', path: '', line: 0, heading: '' })
		expect(findings(review({ comments: [broken] }), RULES)).toEqual([
			'1件目: 型に無いグレード（must / suggestion / imo / nits から1つ）',
			'1件目: path が無い',
			'1件目: line は差分に付く行番号で渡す',
			'1件目: 見出しが無い',
		])
		expect(findings(review({ comments: [comment({ body: 'a\nb\nc\nd' })] }), RULES)).toEqual([
			'1件目: 本文が 4 行（3行以内）',
		])
		expect(
			findings(review({ comments: [comment({ body: 'a\nb\nc\nd\ne\nf' })] }), RULES),
		).toEqual(['1件目: 本文が 6 行（3行以内）', '1件目: コメントが 7 行（6行以内）'])

		const long = comment({ body: '理由。\n\n```js\na\nb\nc\nd\ne\n```' })
		expect(findings(review({ comments: [long] }), RULES)).toEqual([
			'1件目: コメントが 9 行（6行以内）',
		])
	})

	it('サマリを書く判定では理由と実測を欠かせない', () => {
		expect(findings(review({ reason: '', verified: '' }), RULES)).toEqual([
			'判定の理由1文を reason に入れる',
			'実測の状態を verified に入れる',
		])
	})

	it('Approve には理由も実測も要らない', () => {
		const approve = review({ comments: graded('nits'), reason: '', verified: '' })
		expect(findings(approve, RULES)).toEqual([])
	})
})

describe('args', () => {
	it('落とした指摘は組み立てずに理由を返す', () => {
		expect(args(review({ comments: 'x' }), RULES)).toEqual({
			error: ['comments は配列で渡す（0件なら空配列）'],
		})
	})

	it('サマリに判定・件数・実測を置く', () => {
		expect(payload({ comments: graded('must', 'suggestion', 'nits') })).toMatchObject({
			event: 'REQUEST_CHANGES',
			body: [
				'**判定: Request changes** — 初期表示が閉じたままになる。',
				'',
				'- must 1 / suggestion 1 / nits 1',
				'- 実測: `npm run lint` `npm test` は終了コード 0',
			].join('\n'),
		})
	})

	it('Approve にはサマリを付けず、バッジは正本のまま写す', () => {
		expect(payload({ comments: graded('imo') })).toEqual({
			event: 'APPROVE',
			comments: [
				{
					path: 'app/components/Toc.vue',
					line: 12,
					body: [
						'![imo-badge](https://img.shields.io/badge/review-imo-0075ca) **静的生成の HTML では閉じたままになる**',
						'',
						'初期状態がビルド時に焼き付く。',
						'CSS で出し分ける。',
					].join('\n'),
				},
			],
		})
	})

	it('指摘が0件なら comments を渡さない', () => {
		expect(payload({ comments: [] })).toEqual({ event: 'APPROVE' })
	})
})
