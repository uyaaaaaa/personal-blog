// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ArticleShelf from '~/components/article/ArticleShelf.vue'

const articles = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		path: `/article/a${index}`,
		title: `記事${index}`,
		date: '2026-01-02',
	}))

const mount = (count: number, total: number, startNumber = 1) =>
	mountSuspended(ArticleShelf, {
		props: {
			title: 'Blog',
			articles: articles(count),
			total,
			startNumber,
			viewAllPath: '/category/blog',
		},
	})

const viewAll = (wrapper: Awaited<ReturnType<typeof mount>>) =>
	wrapper.findAll('a').find((link) => link.text().includes('View All'))

describe('ArticleShelf', () => {
	it('見出しも View All と同じ導線にする', async () => {
		const wrapper = await mount(5, 8)

		expect(wrapper.get('h2 a').attributes('href')).toBe('/category/blog')
		expect(wrapper.get('h2 a').text()).toBe('Blog')
	})

	it('記事の見出しは棚の見出しの下の階層にし、渡した順に並べる', async () => {
		const wrapper = await mount(3, 3)

		expect(wrapper.findAll('li h3').map((row) => row.text())).toEqual([
			'記事0',
			'記事1',
			'記事2',
		])
		expect(wrapper.findAll('li h2')).toHaveLength(0)
	})

	it('連番は渡された番号から振る', async () => {
		const wrapper = await mount(2, 8, 2)

		expect(wrapper.findAll('li .tabular-nums').map((cell) => cell.text())).toEqual([
			'02',
			'2026.01.02',
			'03',
			'2026.01.02',
		])
	})

	it('総数に届いていなければ View All を出す', async () => {
		expect(viewAll(await mount(5, 8))?.attributes('href')).toBe('/category/blog')
	})

	it('全件見えていれば View All を出さない', async () => {
		expect(viewAll(await mount(5, 5))).toBeUndefined()
	})
})
