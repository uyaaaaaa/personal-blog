// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import DefaultLayout from '~/layouts/default.vue'

const Header = defineComponent({
	props: { location: { type: String, required: true } },
	emits: ['search-navigation'],
	template: '<button class="search-navigation" @click="$emit(\'search-navigation\')" />',
})

describe('default layout', () => {
	it('検索結果からの遷移後はメインコンテンツへフォーカスする', async () => {
		const wrapper = await mountSuspended(DefaultLayout, {
			attachTo: document.body,
			slots: { default: '<h1>Article</h1>' },
			global: {
				stubs: {
					Header,
					Footer: true,
					Toast: true,
				},
			},
		})

		await wrapper.get('.search-navigation').trigger('click')
		await nextTick()

		expect(document.activeElement).toBe(wrapper.get('main').element)

		wrapper.unmount()
	})
})
