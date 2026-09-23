// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import Header from '~/components/layout/Header.vue'

const Navigation = defineComponent({
	props: { isOpen: Boolean },
	emits: ['toggle', 'close'],
	template: '<button class="navigation" @click="$emit(\'toggle\')">{{ isOpen }}</button>',
})

const Search = defineComponent({
	emits: ['select'],
	setup: (_, { expose }) => {
		expose({ close: () => undefined })
	},
	template: '<button class="search" @click="$emit(\'select\', path)" />',
	data: () => ({ path: '/article/vim-abbreviation' }),
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

	it('検索結果を選んだ後の遷移だけを親へ伝える', async () => {
		const wrapper = await mountSuspended(Header, {
			props: { location: '/' },
			global: {
				stubs: {
					HeaderSearch: Search,
					LogoMark: true,
					Navigation,
					SearchDialog: true,
					ThemeToggle: true,
				},
			},
		})

		await wrapper.setProps({ location: '/profile' })
		expect(wrapper.emitted('search-navigation')).toBeUndefined()

		await wrapper.get('.search').trigger('click')
		await wrapper.setProps({ location: '/article/vim-abbreviation' })

		expect(wrapper.emitted('search-navigation')).toHaveLength(1)
	})

	it('現在地の選択を後続の遷移に持ち越さない', async () => {
		const wrapper = await mountSuspended(Header, {
			props: { location: '/article/vim-abbreviation' },
			global: {
				stubs: {
					HeaderSearch: Search,
					LogoMark: true,
					Navigation,
					SearchDialog: true,
					ThemeToggle: true,
				},
			},
		})

		await wrapper.get('.search').trigger('click')
		await wrapper.setProps({ location: '/profile' })

		expect(wrapper.emitted('search-navigation')).toBeUndefined()
	})
})
