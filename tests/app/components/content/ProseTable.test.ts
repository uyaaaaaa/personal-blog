// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ProseTable from '~/components/content/ProseTable.vue'

const frame = () => new Promise((done) => requestAnimationFrame(() => done(undefined)))

const mount = async (scrollWidth: number, clientWidth: number) => {
	const wrapper = await mountSuspended(ProseTable, {
		slots: { default: () => '<tr><td>本文</td></tr>' },
	})
	const box = wrapper.get('.prose-table-scroll').element

	Object.defineProperty(box, 'scrollWidth', { value: scrollWidth, configurable: true })
	Object.defineProperty(box, 'clientWidth', { value: clientWidth, configurable: true })
	window.dispatchEvent(new Event('resize'))
	await frame()
	await wrapper.vm.$nextTick()

	return wrapper.get('.prose-table-scroll')
}

describe('ProseTable', () => {
	it('横に溢れた表をタブ順に入れ、領域として読み上げさせる', async () => {
		const box = await mount(600, 300)

		expect(box.attributes('tabindex')).toBe('0')
		expect(box.attributes('role')).toBe('region')
		expect(box.attributes('aria-label')).toBe('Table')
	})

	it('溢れていない表はタブ順に入れない', async () => {
		const box = await mount(300, 300)

		expect(box.attributes('tabindex')).toBeUndefined()
		expect(box.attributes('role')).toBeUndefined()
	})
})
