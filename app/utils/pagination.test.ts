import { describe, expect, it } from 'vitest'
import { pageLink, paginationItems, parsePage, stripPagePath } from './pagination'

describe('parsePage', () => {
	it('正の整数の表記だけを数値にする', () => {
		expect(parsePage('1')).toBe(1)
		expect(parsePage('2')).toBe(2)
		expect(parsePage('12')).toBe(12)
	})

	it('同じページを指す別表記を受け付けない', () => {
		expect(parsePage('01')).toBeNull()
		expect(parsePage('2.0')).toBeNull()
		expect(parsePage(' 2')).toBeNull()
		expect(parsePage('+2')).toBeNull()
	})

	it('0 と負数を受け付けない', () => {
		expect(parsePage('0')).toBeNull()
		expect(parsePage('-1')).toBeNull()
	})

	it('文字列でないもの、数字でない文字列を受け付けない', () => {
		expect(parsePage('abc')).toBeNull()
		expect(parsePage('')).toBeNull()
		expect(parsePage(undefined)).toBeNull()
		expect(parsePage(2)).toBeNull()
		expect(parsePage(['2'])).toBeNull()
	})
})

describe('stripPagePath', () => {
	it('末尾の /page/N を落とす', () => {
		expect(stripPagePath('/article/page/2')).toBe('/article')
		expect(stripPagePath('/article/page/12')).toBe('/article')
		expect(stripPagePath('/tags/nuxt/page/3')).toBe('/tags/nuxt')
		expect(stripPagePath('/category/tech/page/3')).toBe('/category/tech')
	})

	it('末尾スラッシュを落としてから /page/N を見る', () => {
		expect(stripPagePath('/article/')).toBe('/article')
		expect(stripPagePath('/article/page/2/')).toBe('/article')
	})

	it('1ページ目のパスをそのまま返す', () => {
		expect(stripPagePath('/article')).toBe('/article')
		expect(stripPagePath('/tags/nuxt')).toBe('/tags/nuxt')
	})

	it('ページ番号として認めない表記は剥がさない', () => {
		expect(stripPagePath('/article/page/abc')).toBe('/article/page/abc')
		expect(stripPagePath('/article/page/2/detail')).toBe('/article/page/2/detail')
	})
})

describe('paginationItems', () => {
	it('1ページしか無いとき、そのページだけを返す', () => {
		expect(paginationItems(1, 1, 1)).toEqual([1])
	})

	it('先頭・末尾・現在の前後 radius ページが全部つながるとき gap を挟まない', () => {
		expect(paginationItems(1, 2, 1)).toEqual([1, 2])
		expect(paginationItems(1, 3, 1)).toEqual([1, 2, 3])
		expect(paginationItems(3, 5, 1)).toEqual([1, 2, 3, 4, 5])
		expect(paginationItems(2, 4, 1)).toEqual([1, 2, 3, 4])
	})

	it('離れたところだけを gap にする', () => {
		expect(paginationItems(1, 5, 1)).toEqual([1, 2, 'gap', 5])
		expect(paginationItems(5, 10, 1)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])
	})

	it('最初のページでは前だけ、最後のページでは後ろだけを畳む', () => {
		expect(paginationItems(1, 10, 1)).toEqual([1, 2, 'gap', 10])
		expect(paginationItems(10, 10, 1)).toEqual([1, 'gap', 9, 10])
	})

	it('現在ページの隣が先頭・末尾のとき、そこは畳まない', () => {
		expect(paginationItems(3, 10, 1)).toEqual([1, 2, 3, 4, 'gap', 10])
		expect(paginationItems(8, 10, 1)).toEqual([1, 'gap', 7, 8, 9, 10])
	})

	it('radius の分だけ現在ページの前後を広げる', () => {
		expect(paginationItems(5, 10, 0)).toEqual([1, 'gap', 5, 'gap', 10])
		expect(paginationItems(5, 10, 2)).toEqual([1, 'gap', 3, 4, 5, 6, 7, 'gap', 10])
	})
})

describe('pageLink', () => {
	it('1ページ目は /page/1 を持たない', () => {
		expect(pageLink('/article', 1)).toBe('/article')
		expect(pageLink('/tags/nuxt', 1)).toBe('/tags/nuxt')
	})

	it('2ページ目以降は /page/N を足す', () => {
		expect(pageLink('/article', 2)).toBe('/article/page/2')
		expect(pageLink('/category/tech', 12)).toBe('/category/tech/page/12')
	})
})
