import { describe, expect, it } from 'vitest'
import { categoryFilterItems, isCategory, summarizeCategories } from '~/utils/category'

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

describe('categoryFilterItems', () => {
	const categories = [
		{ slug: 'blog', label: 'Blog', count: 19 },
		{ slug: 'book', label: 'Books', count: 1 },
	] as const

	it('先頭の All が全件を持ち、各カテゴリが自分のパスを持つ', () => {
		expect(categoryFilterItems([...categories], 'blog')).toEqual([
			{ key: 'all', label: 'All', count: 20, path: '/article', current: false },
			{ key: 'blog', label: 'Blog', count: 19, path: '/category/blog', current: true },
			{ key: 'book', label: 'Books', count: 1, path: '/category/book', current: false },
		])
	})

	it('current が null なら All だけが現在地になる', () => {
		expect(
			categoryFilterItems([...categories], null).map((item) => [item.key, item.current]),
		).toEqual([
			['all', true],
			['blog', false],
			['book', false],
		])
	})

	it('カテゴリが無くても All を 0 件で出す', () => {
		expect(categoryFilterItems([], null)).toEqual([
			{ key: 'all', label: 'All', count: 0, path: '/article', current: true },
		])
	})
})
