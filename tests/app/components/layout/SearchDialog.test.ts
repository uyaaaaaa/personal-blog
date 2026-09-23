// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SearchDialog from '~/components/layout/SearchDialog.vue'
import { releaseBackdrop } from '~/composables/useBackdropInert'

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
	releaseBackdrop()
	document.getElementById('main-content')?.remove()
	navigate.mockClear()
})

describe('SearchDialog', () => {
	// フレームを跨ぐと、モバイルブラウザが仮想キーボードを自動表示する判定から外れる
	it('開いた直後、フレームを待たずに入力欄へフォーカスする', async () => {
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: false },
			attachTo: document.body,
		})

		await wrapper.setProps({ isOpen: true })

		expect(document.activeElement).toBe(wrapper.get('input').element)

		wrapper.unmount()
	})

	it('候補をクリックすると閉じる要求を出してメインコンテンツへフォーカスする', async () => {
		const main = mountMain()
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: true, onClose: releaseBackdrop },
			attachTo: document.body,
		})

		await wrapper.get('input').setValue('vim')
		await wrapper.get('[role="option"]').trigger('click')
		await nextTick()

		expect(navigate).toHaveBeenCalledWith('/article/vim-abbreviation')
		expect(navigate).toHaveBeenCalledTimes(1)
		expect(wrapper.emitted('close')).toHaveLength(1)
		expect(document.activeElement).toBe(main)

		wrapper.unmount()
	})

	it('表示幅によらず Enter で選び、メインコンテンツへフォーカスする', async () => {
		const main = mountMain()
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: true, onClose: releaseBackdrop },
			attachTo: document.body,
		})

		await wrapper.get('input').setValue('vim')
		await wrapper.get('input').trigger('keydown', { key: 'Enter' })

		expect(navigate).toHaveBeenCalledWith('/article/vim-abbreviation')
		expect(wrapper.emitted('close')).toHaveLength(1)
		expect(document.activeElement).toBe(main)

		wrapper.unmount()
	})

	it('件数は常設の領域に出し、打つ前は何も言わない', async () => {
		const wrapper = await mountSuspended(SearchDialog, { props: { isOpen: true } })
		const status = () => wrapper.get('.sr-only[role="status"]')

		expect(status().text()).toBe('')
		expect(wrapper.get('.search-note').text()).toBe('Type to search articles by title or tag.')

		await wrapper.get('input').setValue('vim')

		expect(status().text()).toBe('1 article found.')

		await wrapper.get('input').setValue('docker')

		expect(status().text()).toBe('No articles found.')
		expect(wrapper.get('.search-note').text()).toBe('No articles found.')
		expect(wrapper.get('.search-note').attributes('aria-hidden')).toBe('true')
	})
})
