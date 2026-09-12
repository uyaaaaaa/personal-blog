import { CATEGORIES, CATEGORY_LABELS, type Category } from './category'

export interface ShelfArticle {
	path: string
	category?: string
}

export type ShelfLimits = Record<Category, number>

export interface Shelf<T extends ShelfArticle> {
	category: Category
	title: string
	total: number
	articles: T[]
}

// total はヒーローを含むカテゴリの全件数。View All の先（カテゴリページ）がその件数を出す。
export const buildShelves = <T extends ShelfArticle>(
	articles: T[],
	heroPath: string | undefined,
	limits: ShelfLimits,
): Shelf<T>[] => {
	return CATEGORIES.map((category) => {
		const inCategory = articles.filter((article) => article.category === category)
		return {
			category,
			title: CATEGORY_LABELS[category],
			total: inCategory.length,
			articles: inCategory
				.filter((article) => article.path !== heroPath)
				.slice(0, limits[category]),
		}
	}).filter((shelf) => shelf.articles.length > 0)
}
