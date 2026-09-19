// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TocInline from '~/components/article/TocInline.vue'

const links = [
	{ id: 'intro', text: 'はじめに' },
	{ id: 'detail', text: '詳細', children: [{ id: 'detail-a', text: '内訳' }] },
	{ id: 'end', text: 'まとめ' },
]

const mount = () => mountSuspended(TocInline, { props: { links } })

const list = (wrapper: Awaited<ReturnType<typeof mount>>) =>
	wrapper.get<HTMLElement>('#toc-inline-list').element

describe('TocInline', () => {
	it('初期は開いた状態で出す', async () => {
		const wrapper = await mount()

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
		expect(list(wrapper).style.display).toBe('')
	})

	it('押すたびに開閉が入れ替わる', async () => {
		const wrapper = await mount()

		await wrapper.get('button').trigger('click')

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
		expect(list(wrapper).style.display).toBe('none')

		await wrapper.get('button').trigger('click')

		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
		expect(list(wrapper).style.display).toBe('')
	})

	it('見出しに2桁の連番を振る', async () => {
		const wrapper = await mount()

		const numbers = wrapper.findAll('a[href^="#"] > span:first-child').map((it) => it.text())

		expect(numbers).toEqual(['01', '02', '03'])
	})
})
