import { describe, expect, it } from 'vitest'
import { searchArticles } from '~/utils/search'

const articles = [
	{ title: 'Nuxt Content で作るブログ', tags: ['Nuxt', 'SSG'] },
	{ title: 'Cloudflare Pages の trailing slash', tags: ['Cloudflare'] },
	{ title: 'Nuxt を Cloudflare Pages に載せる', tags: ['Nuxt', 'Cloudflare'] },
	{ title: 'vim のコマンド', tags: ['Vim', 'Shell'] },
]

const titles = (query: string) => searchArticles(articles, query).map((article) => article.title)

describe('searchArticles', () => {
	it('タイトルの一部に一致した記事を返す', () => {
		expect(titles('trailing')).toEqual(['Cloudflare Pages の trailing slash'])
	})

	it('日本語のタイトルも部分一致で拾う', () => {
		expect(titles('ブログ')).toEqual(['Nuxt Content で作るブログ'])
	})

	it('大文字と小文字を区別しない', () => {
		expect(titles('NUXT')).toEqual([
			'Nuxt Content で作るブログ',
			'Nuxt を Cloudflare Pages に載せる',
		])
	})

	it('空白で区切った語をすべて含むものだけを返す', () => {
		expect(titles('nuxt cloudflare')).toEqual(['Nuxt を Cloudflare Pages に載せる'])
	})

	it('語の順序はタイトルの並び順と揃っていなくてよい', () => {
		expect(titles('cloudflare nuxt')).toEqual(['Nuxt を Cloudflare Pages に載せる'])
	})

	it('全角の空白も語の区切りとして扱う', () => {
		expect(titles('nuxt　cloudflare')).toEqual(['Nuxt を Cloudflare Pages に載せる'])
	})

	it('渡された順序を保つ', () => {
		expect(titles('a')).toEqual([
			'Cloudflare Pages の trailing slash',
			'Nuxt を Cloudflare Pages に載せる',
		])
	})

	it('一致しなければ空を返す', () => {
		expect(titles('docker')).toEqual([])
	})

	it('空の検索語では何も返さない', () => {
		expect(titles('')).toEqual([])
		expect(titles('   ')).toEqual([])
	})

	it('タイトルに現れない語でも、タグに一致すれば返す', () => {
		expect(titles('shell')).toEqual(['vim のコマンド'])
	})

	it('大文字と小文字を区別せずタグに一致する', () => {
		expect(titles('SSG')).toEqual(['Nuxt Content で作るブログ'])
	})

	it('複数の語はタイトルとタグのどちらで満たしてもよい', () => {
		expect(titles('ブログ ssg')).toEqual(['Nuxt Content で作るブログ'])
		expect(titles('vim shell')).toEqual(['vim のコマンド'])
	})

	it('タイトルとタグの両方に一致しても同じ記事を2回返さない', () => {
		expect(titles('nuxt')).toEqual([
			'Nuxt Content で作るブログ',
			'Nuxt を Cloudflare Pages に載せる',
		])
	})

	it('タグを持たない記事も対象にできる', () => {
		expect(searchArticles([{ title: 'タグ無し記事' }], 'タグ')).toEqual([
			{ title: 'タグ無し記事' },
		])
	})
})
