// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HeaderDrawer from '~/components/layout/HeaderDrawer.vue'

const groups = {
	categories: { heading: 'Categories', items: [] },
	latest: { heading: 'Latest', items: [] },
	tags: { heading: 'Tags', items: [] },
}

describe('HeaderDrawer', () => {
	it('開いたまま CSS で隠れたら閉じる', async () => {
		let shown = true
		const wrapper = await mountSuspended(HeaderDrawer, {
			props: { isOpen: false, groups },
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
})
