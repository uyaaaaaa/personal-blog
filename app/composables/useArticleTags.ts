import { countTags } from '~/utils/tag'

export const useArticleTags = () => {
	return useAsyncData('article-tags', async () => {
		const articles = await queryCollection('article')
			.where('published', '=', true)
			.select('tags')
			.all()

		return countTags(articles)
	})
}
