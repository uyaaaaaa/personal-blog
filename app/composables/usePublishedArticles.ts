export const usePublishedArticles = () =>
	useAsyncData(
		'published-articles',
		() =>
			queryCollection('article')
				.where('published', '=', true)
				.order('date', 'DESC')
				.select('path', 'title', 'date', 'tags', 'category')
				.all(),
		{ default: () => [] },
	)
