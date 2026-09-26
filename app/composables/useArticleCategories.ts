import { publishedArticles } from '~/utils/articleQuery'
import { summarizeCategories } from '~/utils/category'

export const useArticleCategories = () => {
	return useAsyncData('article-categories', async () => {
		const articles = await publishedArticles().select('category').all()

		return summarizeCategories(articles)
	})
}
