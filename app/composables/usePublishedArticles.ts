import { publishedArticles } from '~/utils/articleQuery'

export const usePublishedArticles = () =>
	useAsyncData(
		'published-articles',
		() =>
			publishedArticles()
				.order('date', 'DESC')
				.select('path', 'title', 'date', 'tags', 'category')
				.all(),
		{ default: () => [] },
	)
