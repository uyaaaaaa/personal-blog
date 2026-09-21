import { usePagination } from '~/composables/usePagination'
import { usePageSeo } from '~/composables/usePageSeo'

type IndexedArticle = {
	path: string
	title: string
	date: string
	tags?: string[]
}

export type ArticleIndexView = {
	total: number
	articles: IndexedArticle[]
	startNumber: number
	page: number
	totalPages: number
	basePath: string
}

type ArticleIndexInput = {
	articles: Ref<IndexedArticle[]>
	pageParam: MaybeRefOrGetter<unknown>
	path: MaybeRefOrGetter<string>
	title: string
	description: string
}

export const useArticleIndex = (input: ArticleIndexInput): ComputedRef<ArticleIndexView> => {
	const { page, totalPages, pagedItems, startNumber, basePath } = usePagination(input.articles, {
		pageParam: input.pageParam,
		path: input.path,
	})

	usePageSeo({
		path: input.path,
		title: () =>
			page.value > 1 ? `${input.title} (${page.value}/${totalPages.value})` : input.title,
		description: input.description,
	})

	return computed(() => ({
		total: input.articles.value.length,
		articles: pagedItems.value,
		startNumber: startNumber.value,
		page: page.value,
		totalPages: totalPages.value,
		basePath: basePath.value,
	}))
}
