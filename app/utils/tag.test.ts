import { describe, expect, it } from 'vitest'
import { countTags, tagToSlug } from './tag'

describe('tagToSlug', () => {
	it('英数字以外の連なりをハイフン1つに畳む', () => {
		expect(tagToSlug('github action')).toBe('github-action')
		expect(tagToSlug('@nuxt/content')).toBe('nuxt-content')
		expect(tagToSlug('Vue 3 / Nuxt 4')).toBe('vue-3-nuxt-4')
	})

	it('大文字を小文字にする', () => {
		expect(tagToSlug('S3')).toBe('s3')
		expect(tagToSlug('ReactNative')).toBe('reactnative')
	})

	it('先頭と末尾の記号を落とす', () => {
		expect(tagToSlug('  nuxt.js  ')).toBe('nuxt-js')
		expect(tagToSlug('.NET')).toBe('net')
		expect(tagToSlug('C++')).toBe('c')
	})
})

describe('countTags', () => {
	const article = (...tags: string[]) => ({ tags })

	it('タグごとの件数を数えてスラッグを付ける', () => {
		expect(countTags([article('Nuxt'), article('Nuxt', 'AWS')])).toEqual([
			{ name: 'Nuxt', slug: 'nuxt', count: 2 },
			{ name: 'AWS', slug: 'aws', count: 1 },
		])
	})

	it('件数の多い順に並べる', () => {
		const tags = countTags([article('a', 'b', 'c'), article('b', 'c'), article('c')])

		expect(tags.map((tag) => [tag.name, tag.count])).toEqual([
			['c', 3],
			['b', 2],
			['a', 1],
		])
	})

	it('同数のタグは出現順によらずタグ名順に並べる', () => {
		const tags = countTags([article('nuxt'), article('aws'), article('Vue')])

		expect(tags.map((tag) => tag.name)).toEqual(['aws', 'nuxt', 'Vue'])
	})

	it('タグの無い記事を無視する', () => {
		expect(countTags([{}, article(), article('nuxt')])).toEqual([
			{ name: 'nuxt', slug: 'nuxt', count: 1 },
		])
	})

	it('記事が無ければ空にする', () => {
		expect(countTags([])).toEqual([])
	})
})
