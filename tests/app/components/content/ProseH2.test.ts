// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProseH2 from '~/components/content/ProseH2.vue'
import ProseH3 from '~/components/content/ProseH3.vue'

const scrollIntoView = vi.fn()

let target: HTMLElement

beforeEach(() => {
	scrollIntoView.mockReset()
	target = document.createElement('div')
	target.id = 'section'
	target.scrollIntoView = scrollIntoView
	document.body.append(target)

	window.getSelection = vi.fn(() => ({ isCollapsed: true }) as Selection)
})

afterEach(() => {
	target.remove()
})

const mount = (component: typeof ProseH2, props: Record<string, unknown> = {}) =>
	mountSuspended(component, { props, slots: { default: () => '見出し' } })

const mountHidden = (component: typeof ProseH2) =>
	mountSuspended(component, {
		props: { id: 'footnote-label' },
		attrs: { class: 'sr-only' },
		slots: { default: () => 'Footnotes' },
	})

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

	// remark-gfm が脚注に置く見出しは sr-only なので、Tab の行き先を作ると輪郭が見えないまま止まる。
	// relative を残すと sr-only の position を打ち消して、1px の箱が流れに残る
	it('sr-only の見出しには、リンクも relative も置かない', async () => {
		const wrapper = await mountHidden(component)

		expect(wrapper.find('a').exists()).toBe(false)
		expect(wrapper.get(tag).classes()).not.toContain('relative')
	})

	it('リンクを置く見出しには relative を付ける', async () => {
		const wrapper = await mount(component, { id: 'section' })

		expect(wrapper.get(tag).classes()).toContain('relative')
	})

	it('押す的は文字を包む要素で、見出しの箱そのものではない', async () => {
		const wrapper = await mount(component, { id: 'section' })

		await wrapper.get(tag).trigger('click')
		expect(scrollIntoView).not.toHaveBeenCalled()

		await wrapper.get(`${tag} > span`).trigger('click')
		expect(scrollIntoView).toHaveBeenCalledTimes(1)
	})
})
