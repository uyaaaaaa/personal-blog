export const CATEGORY_LABELS = {
	blog: 'Blog',
	book: 'Books',
} as const

export type Category = keyof typeof CATEGORY_LABELS

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]

export const isCategory = (value: string): value is Category =>
	Object.hasOwn(CATEGORY_LABELS, value)

export interface CategorySummary {
	slug: Category
	label: string
	count: number
}

export const summarizeCategories = (articles: { category?: string }[]): CategorySummary[] => {
	const counts = new Map<string, number>()
	for (const article of articles) {
		if (!article.category) continue
		counts.set(article.category, (counts.get(article.category) ?? 0) + 1)
	}

	return CATEGORIES.map((slug): CategorySummary => ({
		slug,
		label: CATEGORY_LABELS[slug],
		count: counts.get(slug) ?? 0,
	})).filter((category) => category.count > 0)
}

export interface CategoryFilterItem {
	key: string
	label: string
	count: number
	path: string
	current: boolean
}

export const categoryFilterItems = (
	categories: CategorySummary[],
	current: Category | null,
): CategoryFilterItem[] => [
	{
		key: 'all',
		label: 'All',
		count: categories.reduce((total, category) => total + category.count, 0),
		path: '/article',
		current: current === null,
	},
	...categories.map((category) => ({
		key: category.slug,
		label: category.label,
		count: category.count,
		path: `/category/${category.slug}`,
		current: current === category.slug,
	})),
]
