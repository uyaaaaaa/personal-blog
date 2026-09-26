import { usePageSeo } from '~/composables/usePageSeo'
import { parsePage, stripPagePath } from '~/utils/pagination'

const ARTICLES_PER_PAGE = 9

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
	const totalPages = computed(() =>
		Math.max(1, Math.ceil(input.articles.value.length / ARTICLES_PER_PAGE)),
	)

	const pageParam = computed(() => toValue(input.pageParam))
	const page = computed(() => parsePage(pageParam.value) ?? 1)

	if (pageParam.value !== undefined && (page.value < 2 || page.value > totalPages.value)) {
		throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
	}

	const skipped = computed(() => (page.value - 1) * ARTICLES_PER_PAGE)

	usePageSeo({
		path: input.path,
		title: () =>
			page.value > 1 ? `${input.title} (${page.value}/${totalPages.value})` : input.title,
		description: input.description,
	})

	return computed(() => ({
		total: input.articles.value.length,
		articles: input.articles.value.slice(skipped.value, page.value * ARTICLES_PER_PAGE),
		startNumber: skipped.value + 1,
		page: page.value,
		totalPages: totalPages.value,
		basePath: stripPagePath(toValue(input.path)),
	}))
}
