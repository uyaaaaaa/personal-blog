// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import Header from '~/components/layout/Header.vue'

const Navigation = defineComponent({
	props: { isOpen: Boolean },
	emits: ['toggle', 'close'],
	template: '<button class="navigation" @click="$emit(\'toggle\')">{{ isOpen }}</button>',
})

afterEach(() => {
	document.body.classList.remove('scroll-locked')
})

describe('Header', () => {
	it('ドロワーから close を受けると、開閉状態と背面のロックを戻す', async () => {
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
		const navigation = wrapper.getComponent(Navigation)

		await wrapper.get('.navigation').trigger('click')

		expect(wrapper.get('.navigation').text()).toBe('true')
		expect(document.body.classList.contains('scroll-locked')).toBe(true)

		navigation.vm.$emit('close')
		await nextTick()

		expect(wrapper.get('.navigation').text()).toBe('false')
		expect(document.body.classList.contains('scroll-locked')).toBe(false)
	})
})
