export interface SearchableArticle {
	title: string
}

const toTerms = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(Boolean)

// 空白区切りの語をすべて含むタイトルを、渡された順のまま返す
export const searchByTitle = <T extends SearchableArticle>(articles: T[], query: string): T[] => {
	const terms = toTerms(query)
	if (terms.length === 0) return []

	return articles.filter((article) => {
		const title = article.title.toLowerCase()
		return terms.every((term) => title.includes(term))
	})
}
