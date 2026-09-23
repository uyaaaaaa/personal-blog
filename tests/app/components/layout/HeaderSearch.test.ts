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

	it('候補をクリックすると選択を親へ伝える', async () => {
		const wrapper = await mountSuspended(HeaderSearch)

		await wrapper.get('input').setValue('vim')
		await wrapper.get('[role="option"]').trigger('click')

		expect(wrapper.emitted('select')).toEqual([['/article/vim-abbreviation']])
	})

	it('別タブで開くクリックは同一タブの遷移として伝えない', async () => {
		const wrapper = await mountSuspended(HeaderSearch)

		await wrapper.get('input').setValue('vim')
		await wrapper.get('[role="option"]').trigger('click', { metaKey: true })

		expect(wrapper.emitted('select')).toBeUndefined()
	})
})
