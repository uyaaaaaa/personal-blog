import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS, isCategory } from './category'

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
})
