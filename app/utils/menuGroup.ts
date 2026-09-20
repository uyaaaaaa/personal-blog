import type { CategorySummary } from './category'
import type { MenuArticle } from './menuArticle'
import type { TagSummary } from './tag'

export interface MenuGroupItem {
	key: string
	href: string
	primary: string
	secondary: string
	datetime?: string
}

export interface MenuGroup {
	heading: string
	items: MenuGroupItem[]
	viewAllHref?: string
}

export interface MenuGroups {
	categories: MenuGroup
	latest: MenuGroup
	tags: MenuGroup
}

export const buildMenuGroups = (input: {
	categories: CategorySummary[]
	latestItems: MenuArticle[]
	topTags: TagSummary[]
}): MenuGroups => ({
	categories: {
		heading: 'Categories',
		items: input.categories.map((category): MenuGroupItem => ({
			key: category.slug,
			href: `/category/${category.slug}`,
			primary: category.label,
			secondary: String(category.count),
		})),
	},
	latest: {
		heading: 'Latest',
		items: input.latestItems.map((article): MenuGroupItem => ({
			key: article.path,
			href: article.path,
			primary: article.title,
			secondary: article.dateLabel,
			datetime: article.date,
		})),
		viewAllHref: '/article',
	},
	tags: {
		heading: 'Tags',
		items: input.topTags.map((tag): MenuGroupItem => ({
			key: tag.slug,
			href: `/tags/${tag.slug}`,
			primary: tag.name,
			secondary: String(tag.count),
		})),
		viewAllHref: '/tags',
	},
})
