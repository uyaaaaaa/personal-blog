// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import Header from '~/components/layout/Header.vue'

const Navigation = defineComponent({
	props: { isOpen: Boolean },
	emits: ['toggle', 'close'],
	template: '<button class="navigation" @click="$emit(\'toggle\')">{{ isOpen }}</button>',
})

const SearchDialog = defineComponent({
	props: { isOpen: Boolean },
	emits: ['close'],
	template: '<div class="search-dialog">{{ isOpen }}</div>',
})

const mountHeader = (options = {}) =>
	mountSuspended(Header, {
		props: { location: '/' },
		global: {
			stubs: {
				LogoMarkIcon: true,
				Navigation,
				SearchDialog,
				ThemeToggle: true,
			},
		},
		...options,
	})

const pressSearchShortcut = async () => {
	window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
	await nextTick()
}

afterEach(() => {
	document.body.classList.remove('scroll-locked')
})

describe('Header', () => {
	it('ドロワーから close を受けると、開閉状態と背面のロックを戻す', async () => {
		const wrapper = await mountHeader()
		const navigation = wrapper.getComponent(Navigation)

		await wrapper.get('.navigation').trigger('click')

		expect(wrapper.get('.navigation').text()).toBe('true')
		expect(document.body.classList.contains('scroll-locked')).toBe(true)

		navigation.vm.$emit('close')
		await nextTick()

		expect(wrapper.get('.navigation').text()).toBe('false')
		expect(document.body.classList.contains('scroll-locked')).toBe(false)
	})

	it('ヘッダーの検索欄を押すと検索ダイアログが開く', async () => {
		const wrapper = await mountHeader()

		expect(wrapper.get('.search-dialog').text()).toBe('false')

		await wrapper.get('.search-trigger').trigger('click')

		expect(wrapper.get('.search-dialog').text()).toBe('true')
		expect(wrapper.get('.search-trigger').attributes('aria-expanded')).toBe('true')
	})

	it('開いている間の ⌘K で閉じ、開いたところへフォーカスを戻す', async () => {
		const wrapper = await mountHeader({ attachTo: document.body })
		const trigger = wrapper.get('.search-trigger').element as HTMLElement
		Object.defineProperty(trigger, 'getClientRects', { value: () => [{}] })

		await pressSearchShortcut()

		expect(wrapper.get('.search-dialog').text()).toBe('true')

		trigger.blur()
		await pressSearchShortcut()

		expect(wrapper.get('.search-dialog').text()).toBe('false')
		expect(document.activeElement).toBe(trigger)

		wrapper.unmount()
	})
})
