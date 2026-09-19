export interface ReadNextArticle {
	path: string
	category?: string
}

export const readNextArticles = <T extends ReadNextArticle>(
	articles: T[],
	currentPath: string,
	limit: number,
): T[] => {
	const current = articles.find((article) => article.path === currentPath)
	const sameCategory = current
		? articles.filter((article) => article.category === current.category)
		: []
	const currentIndex = sameCategory.findIndex((article) => article.path === currentPath)

	const older = sameCategory.slice(currentIndex + 1)
	const newer = sameCategory.slice(0, Math.max(currentIndex, 0)).reverse()
	const nearest = [...older, ...newer]

	const nearestPaths = new Set(nearest.map((article) => article.path))
	const rest = articles.filter(
		(article) => article.path !== currentPath && !nearestPaths.has(article.path),
	)

	return [...nearest, ...rest].slice(0, limit)
}
