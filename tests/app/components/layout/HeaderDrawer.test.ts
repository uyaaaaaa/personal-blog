// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HeaderDrawer from '~/components/layout/HeaderDrawer.vue'

const groups = {
	categories: { heading: 'Categories', items: [] },
	latest: { heading: 'Latest', items: [] },
	tags: { heading: 'Tags', items: [] },
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('HeaderDrawer', () => {
	it('開いたまま CSS で隠れたら閉じる', async () => {
		let shown = true
		const wrapper = await mountSuspended(HeaderDrawer, {
			props: { isOpen: false, groups, location: '/' },
		})
		Object.defineProperty(wrapper.get('.mobile-drawer').element, 'getClientRects', {
			value: () => (shown ? [{}] : []),
		})

		await wrapper.setProps({ isOpen: true })
		expect(wrapper.emitted('close')).toBeUndefined()

		shown = false
		window.dispatchEvent(new Event('resize'))
		await new Promise((done) => requestAnimationFrame(() => done(undefined)))

		expect(wrapper.emitted('close')).toHaveLength(1)
	})

	it.each([
		['別のページ', 0, '/'],
		['今のページ', 1, '/profile/'],
	])('リンクで%sへ移ると、開いたときに積んだ履歴を %i 回戻す', async (_, backs, location) => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => {})
		const wrapper = await mountSuspended(HeaderDrawer, {
			props: { isOpen: false, groups, location },
		})
		await wrapper.setProps({ isOpen: true })

		await wrapper.get('a[href="/profile"]').trigger('click')
		await wrapper.setProps({ isOpen: false })

		expect(back).toHaveBeenCalledTimes(backs)
	})
})
