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

// Cmd（mac）と Ctrl（Windows）は同じキーの呼び名違い。大文字も見るのは CapsLock で
// 'K' が届くため、Alt を外すのは Windows の AltGr が Ctrl+Alt として届くため
export const isSearchShortcut = (event: KeyboardEvent): boolean =>
	event.key.toLowerCase() === 'k' &&
	(event.metaKey || event.ctrlKey) &&
	!event.altKey &&
	!event.shiftKey
