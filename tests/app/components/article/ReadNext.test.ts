// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReadNext from '~/components/article/ReadNext.vue'

// queryCollection は Nuxt Content の SQLite を開く。ここで測りたいのは取得した一覧に
// 対する描画なので、チェーンをそのまま返すだけのスタブに差し替えて取得先を切る
const { published } = vi.hoisted(() => ({ published: vi.fn() }))

mockNuxtImport('queryCollection', () => () => {
	const builder = {
		where: () => builder,
		order: () => builder,
		limit: () => builder,
		select: () => builder,
		all: async () => published(),
	}
	return builder
})

const article = (path: string) => ({
	path,
	title: `記事${path.split('/').pop()}`,
	date: '2026-01-02',
	category: 'blog',
})

const mount = (currentPath: string) => mountSuspended(ReadNext, { props: { currentPath } })

describe('ReadNext', () => {
	// 取得は記事をまたいで使い回されるキーを持つので、測る条件ごとに捨てる
	beforeEach(() => clearNuxtData())

	it('記事の見出しの下の階層で、次に読む候補を並べる', async () => {
		published.mockReturnValue(['/article/a', '/article/b', '/article/c'].map(article))

		const wrapper = await mount('/article/a')

		expect(wrapper.get('h2').text()).toBe('Read Next')
		expect(wrapper.findAll('li h3').map((row) => row.text())).toEqual(['記事b', '記事c'])
	})

	it('いま読んでいる記事を候補に出さない', async () => {
		published.mockReturnValue(['/article/a', '/article/b'].map(article))

		const wrapper = await mount('/article/a')

		expect(wrapper.findAll('li a').map((link) => link.attributes('href'))).toEqual([
			'/article/b',
		])
	})

	it('一覧へ戻る導線を出す', async () => {
		published.mockReturnValue(['/article/a', '/article/b'].map(article))

		const wrapper = await mount('/article/a')

		const allArticles = wrapper
			.findAll('a')
			.find((link) => link.text().includes('All Articles'))

		expect(allArticles?.attributes('href')).toBe('/article')
	})

	it('候補が無ければ何も描かない', async () => {
		published.mockReturnValue([article('/article/a')])

		const wrapper = await mount('/article/a')

		expect(wrapper.find('section').exists()).toBe(false)
		expect(wrapper.find('h2').exists()).toBe(false)
	})
})
