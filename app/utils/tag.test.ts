import { describe, expect, it } from 'vitest'
import { tagToSlug } from './tag'

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
