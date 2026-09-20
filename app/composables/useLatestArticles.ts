import { publishedArticles } from '~/utils/articleQuery'

export const useLatestArticles = (
	limit: number,
	options: { lazy?: boolean; immediate?: boolean } = {},
) =>
	useAsyncData(
		`latest-articles-${limit}`,
		() =>
			publishedArticles()
				.order('date', 'DESC')
				.limit(limit)
				.select('path', 'title', 'date')
				.all(),
		{ default: () => [], ...options },
	)
