// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProseH2 from '~/components/content/ProseH2.vue'
import ProseH3 from '~/components/content/ProseH3.vue'

const scrollIntoView = vi.fn()
const getSelection = vi.fn<() => Selection | null>()

let target: HTMLElement

beforeEach(() => {
	scrollIntoView.mockReset()
	target = document.createElement('div')
	target.id = 'section'
	target.scrollIntoView = scrollIntoView
	document.body.append(target)

	getSelection.mockReturnValue({ isCollapsed: true } as Selection)
	window.getSelection = getSelection
})

afterEach(() => {
	target.remove()
})

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
		expect(wrapper.get(`${tag} > a`).attributes('aria-hidden')).toBe('true')
	})

	it('id が無ければリンクを置かない', async () => {
		const wrapper = await mount(component)

		expect(wrapper.find('a').exists()).toBe(false)
	})

	it('見出しを押したら節へ移動する', async () => {
		const wrapper = await mount(component, { id: 'section' })

		await wrapper.get(tag).trigger('click')

		expect(scrollIntoView).toHaveBeenCalledTimes(1)
	})

	// アイコンも見出しも移動を持つので、素通しすると1回の押下で2回動く
	it('節のリンクを押したときは、見出しの側では動かない', async () => {
		const wrapper = await mount(component, { id: 'section' })

		await wrapper.get(`${tag} > a`).trigger('click')

		expect(scrollIntoView).toHaveBeenCalledTimes(1)
	})

	it('文字を選んだ直後の押下では動かない', async () => {
		getSelection.mockReturnValue({ isCollapsed: false } as Selection)
		const wrapper = await mount(component, { id: 'section' })

		await wrapper.get(tag).trigger('click')

		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	// remark-gfm が脚注に置く見出しは sr-only なので、Tab の行き先を作ると輪郭が見えないまま止まる
	it('sr-only の見出しにはリンクを置かず、押しても動かない', async () => {
		const wrapper = await mountSuspended(component, {
			props: { id: 'footnote-label' },
			attrs: { class: 'sr-only' },
			slots: { default: () => 'Footnotes' },
		})

		expect(wrapper.find('a').exists()).toBe(false)

		await wrapper.get(tag).trigger('click')

		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	it('id が無ければ押しても動かない', async () => {
		const wrapper = await mount(component)

		await wrapper.get(tag).trigger('click')

		expect(scrollIntoView).not.toHaveBeenCalled()
	})
})
