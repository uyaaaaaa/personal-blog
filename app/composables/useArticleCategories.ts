import { summarizeCategories } from '~/utils/category'

export const useArticleCategories = () => {
	return useAsyncData('article-categories', async () => {
		const articles = await queryCollection('article')
			.where('published', '=', true)
			.select('category')
			.all()

		return summarizeCategories(articles)
	})
}
