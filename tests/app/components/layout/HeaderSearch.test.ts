// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HeaderSearch from '~/components/layout/HeaderSearch.vue'

const navigate = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('navigateTo', () => (path: string) => navigate(path))

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

const mountMain = () => {
	const main = document.createElement('main')
	main.id = 'main-content'
	main.tabIndex = -1
	document.body.append(main)
	return main
}

afterEach(() => {
	document.getElementById('main-content')?.remove()
	navigate.mockClear()
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

	it('候補をクリックするとメインコンテンツへフォーカスする', async () => {
		const main = mountMain()
		const wrapper = await mountSuspended(HeaderSearch, { attachTo: document.body })

		await wrapper.get('input').setValue('vim')
		await wrapper.get('[role="option"]').trigger('click')
		await nextTick()

		expect(navigate).toHaveBeenCalledWith('/article/vim-abbreviation')
		expect(navigate).toHaveBeenCalledTimes(1)
		expect(document.activeElement).toBe(main)
		expect(wrapper.get('.search-panel-layer').classes()).not.toContain('is-open')

		wrapper.unmount()
	})

	it('別タブで開くクリックではフォーカスを移さない', async () => {
		const main = mountMain()
		const wrapper = await mountSuspended(HeaderSearch, { attachTo: document.body })

		await wrapper.get('input').setValue('vim')
		await wrapper.get('[role="option"]').trigger('click', { metaKey: true })
		await nextTick()

		expect(navigate).not.toHaveBeenCalled()
		expect(document.activeElement).not.toBe(main)
		expect(wrapper.get('.search-panel-layer').classes()).not.toContain('is-open')

		wrapper.unmount()
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
