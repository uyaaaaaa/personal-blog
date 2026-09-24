// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SearchDialog from '~/components/layout/SearchDialog.vue'
import { releaseBackdrop } from '~/composables/useBackdropInert'

const navigate = vi.fn().mockResolvedValue(undefined)

mockNuxtImport('navigateTo', () => (path: string, options?: object) => navigate(path, options))

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
	vi.restoreAllMocks()
	releaseBackdrop()
	document.getElementById('main-content')?.remove()
	navigate.mockClear()
})

describe('SearchDialog', () => {
	// フレームを跨ぐと、モバイルブラウザが仮想キーボードを自動表示する判定から外れる
	it('開いた直後、フレームを待たずに入力欄へフォーカスする', async () => {
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: false, location: '/' },
			attachTo: document.body,
		})

		await wrapper.setProps({ isOpen: true })

		expect(document.activeElement).toBe(wrapper.get('input').element)

		wrapper.unmount()
	})

	it('候補をクリックすると閉じる要求を出してメインコンテンツへフォーカスする', async () => {
		const main = mountMain()
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: true, location: '/', onClose: releaseBackdrop },
			attachTo: document.body,
		})

		await wrapper.get('input').setValue('vim')
		await wrapper.get('[role="option"]').trigger('click')
		await nextTick()

		expect(navigate).toHaveBeenCalledWith('/article/vim-abbreviation', { replace: true })
		expect(navigate).toHaveBeenCalledTimes(1)
		expect(wrapper.emitted('close')).toHaveLength(1)
		expect(document.activeElement).toBe(main)

		wrapper.unmount()
	})

	// 今のルートへの遷移は捨てられ、積んだ履歴は記事で置き換わらない
	it.each([
		['別の記事', 0, '/'],
		['見出しを指す今の記事', 0, '/article/vim-abbreviation#usage'],
		['今いる記事', 1, '/article/vim-abbreviation/'],
	])('%sを選ぶと、開いたときに積んだ履歴を %i 回戻す', async (_, backs, location) => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => {})
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: false, location },
			attachTo: document.body,
		})
		await wrapper.setProps({ isOpen: true })

		await wrapper.get('input').setValue('vim')
		await wrapper.get('[role="option"]').trigger('click')
		await wrapper.setProps({ isOpen: false })

		expect(back).toHaveBeenCalledTimes(backs)

		wrapper.unmount()
	})

	it('表示幅によらず Enter で選び、メインコンテンツへフォーカスする', async () => {
		const main = mountMain()
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: true, location: '/', onClose: releaseBackdrop },
			attachTo: document.body,
		})

		await wrapper.get('input').setValue('vim')
		await wrapper.get('input').trigger('keydown', { key: 'Enter' })

		expect(navigate).toHaveBeenCalledWith('/article/vim-abbreviation', { replace: true })
		expect(wrapper.emitted('close')).toHaveLength(1)
		expect(document.activeElement).toBe(main)

		wrapper.unmount()
	})

	const stubViewport = (width: number, height: number, { touch = false } = {}) => {
		const viewport = { width, height, scale: 1 }
		vi.stubGlobal('matchMedia', (media: string) => ({
			media,
			matches: touch && media === '(pointer: coarse)',
		}))
		vi.stubGlobal('visualViewport', viewport)
		vi.stubGlobal('innerWidth', width)
		vi.stubGlobal('innerHeight', height)
		return viewport
	}

	const openAndType = async () => {
		const main = mountMain()
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: false, location: '/', onClose: releaseBackdrop },
			attachTo: document.body,
		})
		await wrapper.setProps({ isOpen: true })
		await wrapper.get('input').setValue('vim')
		return { main, wrapper }
	}

	it('ソフトキーボードが出ている間の Enter は記事へ移らず、キーボードだけ閉じる', async () => {
		const viewport = stubViewport(375, 800, { touch: true })
		const { wrapper } = await openAndType()

		viewport.height = 450
		await wrapper.get('input').trigger('keydown', { key: 'Enter' })

		expect(navigate).not.toHaveBeenCalled()
		expect(wrapper.emitted('close')).toBeUndefined()
		expect(document.activeElement).not.toBe(wrapper.get('input').element)
		expect(wrapper.findAll('[role="option"]')).toHaveLength(1)

		wrapper.unmount()
		vi.unstubAllGlobals()
	})

	it('開いたあとに横へ回して低くなっても、キーボードの無い Enter は記事へ移る', async () => {
		stubViewport(375, 800, { touch: true })
		const { main, wrapper } = await openAndType()

		stubViewport(800, 375, { touch: true })
		await wrapper.get('input').trigger('keydown', { key: 'Enter' })

		expect(navigate).toHaveBeenCalledTimes(1)
		expect(document.activeElement).toBe(main)

		wrapper.unmount()
		vi.unstubAllGlobals()
	})

	it('PC で開いたあとに窓を低くしても、Enter は記事へ移る', async () => {
		stubViewport(1280, 800)
		const { main, wrapper } = await openAndType()

		stubViewport(1280, 450)
		await wrapper.get('input').trigger('keydown', { key: 'Enter' })

		expect(navigate).toHaveBeenCalledTimes(1)
		expect(document.activeElement).toBe(main)

		wrapper.unmount()
		vi.unstubAllGlobals()
	})

	it('Cancel を押すと閉じる要求を出す', async () => {
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: true, location: '/' },
		})

		await wrapper.get('.search-cancel').trigger('click')

		expect(wrapper.emitted('close')).toHaveLength(1)
	})

	it('件数は常設の領域に出し、打つ前は何も言わない', async () => {
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: true, location: '/' },
		})
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
