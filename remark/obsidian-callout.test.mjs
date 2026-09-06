import { describe, expect, it } from 'vitest'
// remark-mdc だけ依存に宣言しない。宣言すると版が別に解決され、記事を変換するのとは
// 違う実体を測ることになるため
import remarkMdc from 'remark-mdc'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import remarkObsidianCallout from './obsidian-callout.mjs'

const text = (value) => ({ type: 'text', value })

const span = (value, attributes = {}) => ({
	type: 'textComponent',
	name: 'span',
	attributes,
	children: [text(value)],
})

const quote = (...children) => ({
	type: 'root',
	children: [{ type: 'blockquote', children: [{ type: 'paragraph', children }] }],
})

const transform = (tree) => {
	remarkObsidianCallout()(tree)
	return tree.children[0]
}

describe('remarkObsidianCallout', () => {
	it('タイプ・タイトル・折りたたみ記号を callout の属性にする', () => {
		const callout = transform(quote(span('!note'), text('- タイトル\n本文')))

		expect(callout.data.hName).toBe('callout')
		expect(callout.data.hProperties).toEqual({ type: 'note', title: 'タイトル', fold: '-' })
	})

	it('タイトル行の後に続く本文を残す', () => {
		const callout = transform(quote(span('!note'), text('- タイトル\n本文1\n本文2')))

		expect(callout.children[0].children).toEqual([text('本文1\n本文2')])
	})

	it('タイトルが無ければ title を付けず、本文だけを残す', () => {
		const callout = transform(quote(span('!warning'), text('\n本文')))

		expect(callout.data.hProperties).toEqual({ type: 'warning' })
		expect(callout.children[0].children).toEqual([text('本文')])
	})

	it('+ を開いた状態の折りたたみとして拾う', () => {
		const callout = transform(quote(span('!note'), text('+ タイトル\n本文')))

		expect(callout.data.hProperties).toEqual({ type: 'note', title: 'タイトル', fold: '+' })
	})

	it('折りたたみ記号が無ければ fold を付けない', () => {
		const callout = transform(quote(span('!note'), text(' タイトル\n本文')))

		expect(callout.data.hProperties).toEqual({ type: 'note', title: 'タイトル' })
	})

	it('タイプ名を小文字にする', () => {
		const callout = transform(quote(span('!NOTE'), text(' タイトル\n本文')))

		expect(callout.data.hProperties.type).toBe('note')
	})

	it('本文が無ければタイトル行の段落ごと落とす', () => {
		const callout = transform(quote(span('!note'), text('- タイトル')))

		expect(callout.data.hProperties).toEqual({ type: 'note', title: 'タイトル', fold: '-' })
		expect(callout.children).toEqual([])
	})

	it('タイプ名だけの行も callout にする', () => {
		const callout = transform(quote(span('!note')))

		expect(callout.data.hProperties).toEqual({ type: 'note' })
		expect(callout.children).toEqual([])
	})

	it('callout でない blockquote は触らない', () => {
		const quoteNode = transform(quote(text('ふつうの引用')))

		expect(quoteNode.data).toBeUndefined()
		expect(quoteNode.children[0].children).toEqual([text('ふつうの引用')])
	})

	it('属性の付いた span は触らない', () => {
		const quoteNode = transform(quote(span('!note', { id: 'x' }), text(' タイトル')))

		expect(quoteNode.data).toBeUndefined()
	})

	it('span に見えても記法に合わない中身は触らない', () => {
		expect(transform(quote(span('note'), text(' タイトル'))).data).toBeUndefined()
		expect(transform(quote(span('!not e'), text(' タイトル'))).data).toBeUndefined()
	})

	it('remark-mdc が実際に作る木でも同じ結果になる', () => {
		const tree = unified()
			.use(remarkParse)
			.use(remarkMdc)
			.parse('> [!note]- タイトル\n> 本文\n')
		const callout = transform(tree)

		expect(callout.data.hName).toBe('callout')
		expect(callout.data.hProperties).toEqual({ type: 'note', title: 'タイトル', fold: '-' })
		expect(callout.children[0].children[0].value).toBe('本文')
	})
})
