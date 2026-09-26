import { describe, expect, it } from 'vitest'
import { contentPath } from '~/utils/contentPath'

describe('contentPath', () => {
	it('末尾のスラッシュを落とす', () => {
		expect(contentPath('/article/foo/')).toBe('/article/foo')
		expect(contentPath('/digest/2026-09-12/fourth//')).toBe('/digest/2026-09-12/fourth')
	})

	it('末尾にスラッシュの無いパスはそのまま返す', () => {
		expect(contentPath('/article/foo')).toBe('/article/foo')
	})

	it('根はスラッシュ1つに戻す', () => {
		expect(contentPath('/')).toBe('/')
	})
})
