// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from '~/components/layout/Header.vue'

const listeners = new Set<() => void>()
const media = {
	matches: false,
	addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
	removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
}

const Navigation = defineComponent({
	props: { isOpen: Boolean },
	emits: ['toggle', 'close'],
	template: '<button class="navigation" @click="$emit(\'toggle\')">{{ isOpen }}</button>',
})

beforeEach(() => {
	media.matches = false
	listeners.clear()
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => media),
	)
})

afterEach(() => {
	document.body.classList.remove('scroll-locked')
	vi.unstubAllGlobals()
})

describe('Header', () => {
	it('ドロワーを開いたまま md に入ると、開閉状態と背面のロックを戻す', async () => {
		const wrapper = await mountSuspended(Header, {
			props: { location: '/' },
			global: {
				stubs: {
					HeaderSearch: true,
					LogoMark: true,
					Navigation,
					SearchDialog: true,
					ThemeToggle: true,
				},
			},
		})

		await wrapper.get('.navigation').trigger('click')

		expect(wrapper.get('.navigation').text()).toBe('true')
		expect(document.body.classList.contains('scroll-locked')).toBe(true)

		media.matches = true
		for (const listener of listeners) listener()
		await nextTick()

		expect(wrapper.get('.navigation').text()).toBe('false')
		expect(document.body.classList.contains('scroll-locked')).toBe(false)
	})
})
