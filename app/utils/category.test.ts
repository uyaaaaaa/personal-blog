import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS, isCategory, summarizeCategories } from './category'

describe('CATEGORIES', () => {
	it('CATEGORY_LABELS のキーと同じ並びになる', () => {
		expect(CATEGORIES).toEqual(Object.keys(CATEGORY_LABELS))
	})
})

describe('isCategory', () => {
	it('定義済みのカテゴリで真になる', () => {
		expect(isCategory('blog')).toBe(true)
		expect(isCategory('book')).toBe(true)
	})

	it('表示名や大文字違いでは偽になる', () => {
		expect(isCategory('Blog')).toBe(false)
		expect(isCategory('Books')).toBe(false)
		expect(isCategory('books')).toBe(false)
	})

	it('未定義の値では偽になる', () => {
		expect(isCategory('')).toBe(false)
		expect(isCategory('article')).toBe(false)
	})

	it('Object.prototype のキーでは偽になる', () => {
		expect(isCategory('toString')).toBe(false)
		expect(isCategory('constructor')).toBe(false)
		expect(isCategory('hasOwnProperty')).toBe(false)
		expect(isCategory('__proto__')).toBe(false)
	})
})

describe('summarizeCategories', () => {
	it('CATEGORIES の並びで、表示名と件数を付ける', () => {
		expect(
			summarizeCategories([{ category: 'book' }, { category: 'blog' }, { category: 'blog' }]),
		).toEqual([
			{ slug: 'blog', label: 'Blog', count: 2 },
			{ slug: 'book', label: 'Books', count: 1 },
		])
	})

	it('0件のカテゴリを落とす', () => {
		expect(summarizeCategories([{ category: 'blog' }])).toEqual([
			{ slug: 'blog', label: 'Blog', count: 1 },
		])
	})

	it('カテゴリの無い記事と知らないカテゴリの記事を数えない', () => {
		expect(summarizeCategories([{}, { category: '' }, { category: 'diary' }])).toEqual([])
	})

	it('記事が無ければ空にする', () => {
		expect(summarizeCategories([])).toEqual([])
	})
})
