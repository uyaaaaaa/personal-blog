import { parsePage, stripPagePath } from '~/utils/pagination'

export const ARTICLES_PER_PAGE = 9

type PaginationLocation = {
	pageParam: MaybeRefOrGetter<unknown>
	path: MaybeRefOrGetter<string>
}

export const usePagination = <T>(
	items: Ref<T[]>,
	location: PaginationLocation,
	perPage = ARTICLES_PER_PAGE,
) => {
	const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / perPage)))

	const pageParam = computed(() => toValue(location.pageParam))
	const page = computed(() => parsePage(pageParam.value) ?? 1)

	if (pageParam.value !== undefined && (page.value < 2 || page.value > totalPages.value)) {
		throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
	}

	const skipped = computed(() => (page.value - 1) * perPage)

	const pagedItems = computed(() => items.value.slice(skipped.value, page.value * perPage))

	const startNumber = computed(() => skipped.value + 1)

	const basePath = computed(() => stripPagePath(toValue(location.path)))

	return { page, totalPages, pagedItems, startNumber, basePath }
}
