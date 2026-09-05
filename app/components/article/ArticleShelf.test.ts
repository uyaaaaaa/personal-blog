// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ArticleShelf from './ArticleShelf.vue'

const articles = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		path: `/article/a${index}`,
		title: `記事${index}`,
		date: '2026-01-02',
	}))

const mount = (count: number, total: number) =>
	mountSuspended(ArticleShelf, {
		props: {
			title: 'Backend',
			articles: articles(count),
			total,
			viewAllPath: '/category/backend',
		},
	})

const viewAll = (wrapper: Awaited<ReturnType<typeof mount>>) =>
	wrapper.findAll('a').find((link) => link.text().includes('View All'))

describe('ArticleShelf', () => {
	it('見出しも View All と同じ導線にする', async () => {
		const wrapper = await mount(6, 10)

		expect(wrapper.get('h2 a').attributes('href')).toBe('/category/backend')
		expect(wrapper.get('h2 a').text()).toBe('Backend')
	})

	it('渡した件数が総数に届いていなければ両方の幅で出す', async () => {
		const wrapper = await mount(6, 10)

		expect(viewAll(wrapper)?.classes()).toContain('flex')
		expect(viewAll(wrapper)?.classes()).not.toContain('hidden')
	})

	it('モバイルで全件見えていてもデスクトップで隠れる分があればデスクトップだけに出す', async () => {
		const wrapper = await mount(6, 6)

		expect(viewAll(wrapper)?.classes()).toEqual(expect.arrayContaining(['hidden', 'lg:flex']))
	})

	it('どちらの幅でも全件見えていれば出さない', async () => {
		const wrapper = await mount(4, 4)

		expect(viewAll(wrapper)).toBeUndefined()
	})

	it('デスクトップの上限より少ない棚でも、総数に届いていなければ出す', async () => {
		const wrapper = await mount(2, 3)

		expect(viewAll(wrapper)?.classes()).toContain('flex')
	})

	it('5枚目以降のカードはデスクトップで落とす', async () => {
		const wrapper = await mount(6, 10)

		const cards = wrapper.findAll('.article-card')
		expect(cards).toHaveLength(6)
		expect(cards.slice(0, 4).every((card) => !card.classes().includes('lg:hidden'))).toBe(true)
		expect(cards.slice(4).every((card) => card.classes().includes('lg:hidden'))).toBe(true)
	})
})
