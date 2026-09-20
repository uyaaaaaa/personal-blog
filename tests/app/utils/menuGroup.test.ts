import { describe, expect, it } from 'vitest'
import { buildMenuGroups } from '~/utils/menuGroup'

describe('buildMenuGroups', () => {
	const categories = [{ slug: 'blog', label: 'Blog', count: 2 }] as const
	const latestItems = [{ path: '/article/a', title: 'A', date: '2024-01-01', dateLabel: '1日前' }]
	const topTags = [{ name: 'Nuxt', slug: 'nuxt', count: 3 }]

	it('カテゴリをリンク先とラベル・件数に変換する', () => {
		const groups = buildMenuGroups({
			categories: [...categories],
			latestItems: [],
			topTags: [],
		})

		expect(groups.categories).toEqual({
			heading: 'Categories',
			items: [{ key: 'blog', href: '/category/blog', primary: 'Blog', secondary: '2' }],
		})
	})

	it('最新記事をリンク先とタイトル・日付に変換し、View All を持つ', () => {
		const groups = buildMenuGroups({ categories: [], latestItems, topTags: [] })

		expect(groups.latest).toEqual({
			heading: 'Latest',
			items: [
				{
					key: '/article/a',
					href: '/article/a',
					primary: 'A',
					secondary: '1日前',
					datetime: '2024-01-01',
				},
			],
			viewAllHref: '/article',
		})
	})

	it('タグをリンク先と名前・件数に変換し、View All を持つ', () => {
		const groups = buildMenuGroups({ categories: [], latestItems: [], topTags })

		expect(groups.tags).toEqual({
			heading: 'Tags',
			items: [{ key: 'nuxt', href: '/tags/nuxt', primary: 'Nuxt', secondary: '3' }],
			viewAllHref: '/tags',
		})
	})
})
