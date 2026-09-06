export interface SearchableArticle {
	title: string
	tags?: string[]
}

const toTerms = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(Boolean)

export const searchArticles = <T extends SearchableArticle>(articles: T[], query: string): T[] => {
	const terms = toTerms(query)
	if (terms.length === 0) return []

	return articles.filter((article) => {
		const title = article.title.toLowerCase()
		const tags = (article.tags ?? []).map((tag) => tag.toLowerCase())
		return terms.every((term) => title.includes(term) || tags.some((tag) => tag.includes(term)))
	})
}
