// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ProseH2 from '~/components/content/ProseH2.vue'
import ProseH3 from '~/components/content/ProseH3.vue'

const mount = (component: typeof ProseH2, props: Record<string, unknown> = {}) =>
	mountSuspended(component, { props, slots: { default: () => '見出し' } })

describe.each([
	['ProseH2', ProseH2, 'h2'],
	['ProseH3', ProseH3, 'h3'],
])('%s', (_name, component, tag) => {
	it('見出しのテキストはリンクにせず、節へのリンクを別に置く', async () => {
		const wrapper = await mount(component, { id: 'section' })

		expect(wrapper.get(tag).text()).toBe('見出し')
		expect(wrapper.get(`${tag} > a`).attributes('href')).toBe('#section')
		expect(wrapper.get(`${tag} > a`).text()).toBe('')
	})

	it('id が無ければリンクを置かない', async () => {
		const wrapper = await mount(component)

		expect(wrapper.find('a').exists()).toBe(false)
	})
})
