export const useLatestArticles = (
	limit: number,
	options: { lazy?: boolean; immediate?: boolean } = {},
) =>
	useAsyncData(
		`latest-articles-${limit}`,
		() =>
			queryCollection('article')
				.where('published', '=', true)
				.order('date', 'DESC')
				.limit(limit)
				.select('path', 'title', 'date')
				.all(),
		{ default: () => [], ...options },
	)
