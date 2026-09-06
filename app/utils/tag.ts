// 例: "github action" -> "github-action", "@nuxt/content" -> "nuxt-content", "S3" -> "s3"
export const tagToSlug = (tag: string): string => {
	return tag
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export interface TagSummary {
	name: string
	slug: string
	count: number
}

// 件数の多い順、同数はタグ名順
export const countTags = (articles: { tags?: string[] }[]): TagSummary[] => {
	const counts = new Map<string, number>()
	for (const article of articles) {
		for (const tag of article.tags ?? []) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1)
		}
	}

	return [...counts.entries()]
		.map(([name, count]): TagSummary => ({ name, slug: tagToSlug(name), count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
