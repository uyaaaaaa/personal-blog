// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HeaderSearch from '~/components/layout/HeaderSearch.vue'

// queryCollection は Nuxt Content の SQLite を開く。記事を1本返すスタブで取得先を切る
mockNuxtImport('queryCollection', () => () => {
	const builder = {
		where: () => builder,
		order: () => builder,
		select: () => builder,
		all: async () => [{ path: '/article/vim-abbreviation', title: 'vim', date: '2026-01-17' }],
	}
	return builder
})

describe('HeaderSearch', () => {
	it('語を打つまで候補を出さない', async () => {
		const wrapper = await mountSuspended(HeaderSearch)

		expect(wrapper.get('.search-panel-layer').classes()).not.toContain('is-open')
		expect(wrapper.find('[role="listbox"]').exists()).toBe(false)

		await wrapper.get('input').setValue('vim')

		expect(wrapper.get('.search-panel-layer').classes()).toContain('is-open')
		expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
	})
	it('件数を読み上げる状態は、候補が並んでいる間だけ持つ', async () => {
		const wrapper = await mountSuspended(HeaderSearch)
		const status = () => wrapper.get('.sr-only[role="status"]')

		await wrapper.get('input').setValue('vim')

		expect(status().text()).toBe('1 article found.')

		await wrapper.get('.header-search').trigger('focusout')

		expect(status().text()).toBe('')
	})

	it('0件でも読み上げ用の領域は消さず、案内は今までの文のまま出す', async () => {
		const wrapper = await mountSuspended(HeaderSearch)

		await wrapper.get('input').setValue('docker')

		expect(wrapper.get('.sr-only[role="status"]').text()).toBe('')
		expect(wrapper.get('.search-note').text()).toBe('No articles found.')
	})
})
