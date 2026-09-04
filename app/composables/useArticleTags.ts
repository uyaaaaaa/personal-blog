import { tagToSlug } from '../utils/tag'

export interface TagSummary {
	name: string
	slug: string
	count: number
}

export const useArticleTags = () => {
	return useAsyncData('article-tags', async () => {
		const articles = await queryCollection('article')
			.where('published', '=', true)
			.select('tags')
			.all()

		const counts = new Map<string, number>()
		for (const article of articles) {
			for (const tag of article.tags ?? []) {
				counts.set(tag, (counts.get(tag) ?? 0) + 1)
			}
		}

		return [...counts.entries()]
			.map(([name, count]): TagSummary => ({ name, slug: tagToSlug(name), count }))
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
	})
}
