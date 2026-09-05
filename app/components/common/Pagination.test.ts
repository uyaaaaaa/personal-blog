// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import Pagination from './Pagination.vue'

const mount = (page: number, totalPages: number, basePath = '/article') =>
	mountSuspended(Pagination, { props: { page, totalPages, basePath } })

describe('Pagination', () => {
	it('ページが1つなら nav ごと出さない', async () => {
		const wrapper = await mount(1, 1)

		expect(wrapper.find('nav').exists()).toBe(false)
	})

	it('現在ページはリンクではなく aria-current="page" の span で出す', async () => {
		const wrapper = await mount(2, 3)

		const current = wrapper.get('[aria-current="page"]')
		expect(current.element.tagName).toBe('SPAN')
		expect(current.text()).toBe('2')
		expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1)
	})

	it('先頭では前へが aria-hidden の span になり、次へはリンクのまま', async () => {
		const wrapper = await mount(1, 3)

		expect(wrapper.find('[aria-label="Previous page"]').exists()).toBe(false)
		expect(wrapper.get('[aria-label="Next page"]').attributes('href')).toBe('/article/page/2')
		expect(wrapper.get('span[aria-hidden="true"]').element.tagName).toBe('SPAN')
	})

	it('末尾では次へが aria-hidden の span になり、前へはリンクのまま', async () => {
		const wrapper = await mount(3, 3)

		expect(wrapper.find('[aria-label="Next page"]').exists()).toBe(false)
		expect(wrapper.get('[aria-label="Previous page"]').attributes('href')).toBe(
			'/article/page/2',
		)
	})

	it('中ほどでは前後ともリンクで、隣のページを指す', async () => {
		const wrapper = await mount(5, 10)

		expect(wrapper.get('[aria-label="Previous page"]').attributes('href')).toBe(
			'/article/page/4',
		)
		expect(wrapper.get('[aria-label="Next page"]').attributes('href')).toBe('/article/page/6')
		expect(wrapper.findAll('span[aria-hidden="true"]')).toHaveLength(0)
	})

	it('1ページ目へのリンクは /page/1 を持たず basePath を指す', async () => {
		const wrapper = await mount(3, 5, '/tags/nuxt')

		const links = wrapper.findAll('a:not([aria-label])')
		expect(links.map((link) => link.attributes('href'))).toContain('/tags/nuxt')
		expect(links.map((link) => link.attributes('href'))).not.toContain('/tags/nuxt/page/1')
	})

	it('離れたページの間に省略記号を出す', async () => {
		const wrapper = await mount(5, 10)

		expect(
			wrapper
				.findAll('nav > span, nav > a')
				.map((node) => node.text())
				.filter((text) => text !== ''),
		).toEqual(['1', '…', '4', '5', '6', '…', '10'])
	})
})
