// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import CategoryFilter from '~/components/article/CategoryFilter.vue'

// queryCollection は Nuxt Content の SQLite を開く。ここで測りたいのは current に対する
// 描画なので、カテゴリを持つ記事を返すだけのスタブに差し替えて取得先を切る
mockNuxtImport('queryCollection', () => () => {
	const builder = {
		where: () => builder,
		order: () => builder,
		select: () => builder,
		all: async () => [{ category: 'blog' }, { category: 'blog' }, { category: 'book' }],
	}
	return builder
})

const mount = (current: 'blog' | 'book' | null) =>
	mountSuspended(CategoryFilter, { props: { current } })

const pills = (wrapper: Awaited<ReturnType<typeof mount>>) =>
	wrapper
		.findAll('a')
		.map((link) => [
			...link.findAll('span').map((span) => span.text()),
			link.attributes('href'),
		])

describe('CategoryFilter', () => {
	it('All と各カテゴリを件数つきで並べる', async () => {
		const wrapper = await mount(null)

		expect(pills(wrapper)).toEqual([
			['All', '3', '/article'],
			['Blog', '2', '/category/blog'],
			['Books', '1', '/category/book'],
		])
	})

	it('現在地のリンクだけが現在項目になる', async () => {
		const wrapper = await mount('book')

		const current = wrapper.findAll('[aria-current]')
		expect(current).toHaveLength(1)
		expect(current[0]?.attributes('href')).toBe('/category/book')
	})

	it('current が null なら All が現在地になる', async () => {
		const wrapper = await mount(null)

		expect(wrapper.get('[aria-current]').attributes('href')).toBe('/article')
	})

	// ページ送りが同じ文書で aria-current="page" を出す。集合の中の現在項目は 'true'
	it('現在項目は page ではなく true で示す', async () => {
		const wrapper = await mount('blog')

		expect(wrapper.get('[aria-current]').attributes('aria-current')).toBe('true')
	})

	it('タブではなくリンクの並びとして出す', async () => {
		const wrapper = await mount('blog')

		expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
		expect(wrapper.get('nav').attributes('aria-label')).toBe('Categories')
	})
})
