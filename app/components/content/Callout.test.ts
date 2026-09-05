// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import Callout from './Callout.vue'

const mount = (props: Record<string, unknown> = {}) =>
	mountSuspended(Callout, { props, slots: { default: () => '本文' } })

describe('Callout', () => {
	it('fold が無ければタイトル行をボタンにしない', async () => {
		const wrapper = await mount({ type: 'note' })

		expect(wrapper.find('button').exists()).toBe(false)
		expect(wrapper.get('.callout-title').element.tagName).toBe('DIV')
		expect(wrapper.get('.callout-title').attributes('aria-expanded')).toBeUndefined()
	})

	it('fold が - なら閉じた状態のボタンにする', async () => {
		const wrapper = await mount({ type: 'note', fold: '-' })

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
		expect(wrapper.get('.callout-content').attributes('style')).toContain('display: none')
	})

	it('fold が + なら開いた状態のボタンにする', async () => {
		const wrapper = await mount({ type: 'note', fold: '+' })

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
		expect(wrapper.get('.callout-content').attributes('style')).toBeUndefined()
	})

	it('クリックで aria-expanded が反転する', async () => {
		const wrapper = await mount({ type: 'note', fold: '-' })

		await wrapper.get('button').trigger('click')
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')

		await wrapper.get('button').trigger('click')
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
	})

	it('title が無ければタイプ名を大文字始まりで出す', async () => {
		expect((await mount({ type: 'warning' })).get('.callout-title').text()).toBe('Warning')
		expect((await mount({ type: 'TLDR' })).get('.callout-title').text()).toBe('Tldr')
		expect((await mount({ type: 'note', title: '補足' })).get('.callout-title').text()).toBe(
			'補足',
		)
	})

	it('エイリアスと未知のタイプを data-callout に正規化する', async () => {
		const attr = async (type?: string) =>
			(await mount(type === undefined ? {} : { type }))
				.get('.callout')
				.attributes('data-callout')

		expect(await attr('tldr')).toBe('abstract')
		expect(await attr('CAUTION')).toBe('warning')
		expect(await attr('しらないタイプ')).toBe('note')
		expect(await attr(undefined)).toBe('note')
	})
})
