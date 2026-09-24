// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import Toc from '~/components/article/Toc.vue'
import { TOC_COLLAPSED_ATTRIBUTE, TOC_COLLAPSED_KEY } from '~/utils/tocCollapse'

const links = [
	{ id: 'intro', text: 'はじめに' },
	{ id: 'end', text: 'まとめ' },
]

const mount = () => mountSuspended(Toc, { props: { links } })

const collapsed = () => document.documentElement.hasAttribute(TOC_COLLAPSED_ATTRIBUTE)

afterEach(() => {
	localStorage.clear()
	document.documentElement.removeAttribute(TOC_COLLAPSED_ATTRIBUTE)
})

describe('Toc', () => {
	it('押すと畳んだことを保存し、名前を変えずに状態だけを伝える', async () => {
		const wrapper = await mount()
		const button = wrapper.get('button')

		await button.trigger('click')

		expect(button.attributes('aria-expanded')).toBe('false')
		expect(button.attributes('aria-label')).toBe('Contents')
		expect(collapsed()).toBe(true)
		expect(localStorage.getItem(TOC_COLLAPSED_KEY)).not.toBeNull()

		await button.trigger('click')

		expect(button.attributes('aria-expanded')).toBe('true')
		expect(collapsed()).toBe(false)
		expect(localStorage.getItem(TOC_COLLAPSED_KEY)).toBeNull()
	})

	it('描画前に畳まれていたら、畳んだ状態から始める', async () => {
		document.documentElement.setAttribute(TOC_COLLAPSED_ATTRIBUTE, '')

		const wrapper = await mount()

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
	})

	it('別のタブで畳んだら合わせる', async () => {
		const wrapper = await mount()

		window.dispatchEvent(
			new StorageEvent('storage', { key: TOC_COLLAPSED_KEY, newValue: 'true' }),
		)
		await wrapper.vm.$nextTick()

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
		expect(collapsed()).toBe(true)
	})

	it('Escape でツールチップを消し、次に乗せたら戻す', async () => {
		const wrapper = await mount()
		const tooltip = () => wrapper.get('button > span[aria-hidden="true"]')

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		await wrapper.vm.$nextTick()

		expect(tooltip().classes()).toContain('invisible')

		await wrapper.get('button').trigger('pointerenter')

		expect(tooltip().classes()).not.toContain('invisible')
	})
})
