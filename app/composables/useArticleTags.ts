import { publishedArticles } from '~/utils/articleQuery'
import { countTags } from '~/utils/tag'

export const useArticleTags = () => {
	return useAsyncData('article-tags', async () => {
		const articles = await publishedArticles().select('tags').all()

		return countTags(articles)
	})
}
