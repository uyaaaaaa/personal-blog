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
		expect(wrapper.get(`${tag} > a`).attributes('aria-label')).toBe('Copy link to this section')
	})

	it('id が無ければリンクを置かない', async () => {
		const wrapper = await mount(component)

		expect(wrapper.find('a').exists()).toBe(false)
	})

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

	it('PC では押せる見出し本文をリンクと同じカーソルにする', async () => {
		const wrapper = await mount(component, { id: 'section' })

		expect(wrapper.get(`${tag} > span`).classes()).toContain('lg:cursor-pointer')
	})

	it('押せない見出し本文にはポインターカーソルを出さない', async () => {
		const withoutId = await mount(component)
		const hidden = await mountHidden(component)

		expect(withoutId.get(`${tag} > span`).classes()).not.toContain('lg:cursor-pointer')
		expect(hidden.get(`${tag} > span`).classes()).not.toContain('lg:cursor-pointer')
	})
})
