// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ProsePre from '~/components/content/ProsePre.vue'

const frame = () => new Promise((done) => requestAnimationFrame(() => done(undefined)))

const mount = async (scrollWidth: number, clientWidth: number) => {
	const wrapper = await mountSuspended(ProsePre, {
		attrs: { 'data-from-content': 'shiki' },
		props: { language: 'sh' },
		slots: { default: () => '<code>npm run build</code>' },
	})
	const box = wrapper.get('pre').element

	Object.defineProperty(box, 'scrollWidth', { value: scrollWidth, configurable: true })
	Object.defineProperty(box, 'clientWidth', { value: clientWidth, configurable: true })
	window.dispatchEvent(new Event('resize'))
	await frame()
	await wrapper.vm.$nextTick()

	return wrapper.get('pre')
}

describe('ProsePre', () => {
	it('横に溢れたコードをタブ順に入れ、Nuxt Content が渡す属性も残す', async () => {
		const code = await mount(600, 300)

		expect(code.attributes('tabindex')).toBe('0')
		expect(code.attributes('role')).toBe('region')
		expect(code.attributes('aria-label')).toBe('Code')
		expect(code.attributes('data-from-content')).toBe('shiki')
	})

	it('溢れていないコードはタブ順に入れない', async () => {
		const code = await mount(300, 300)

		expect(code.attributes('tabindex')).toBeUndefined()
		expect(code.attributes('role')).toBeUndefined()
	})
})
