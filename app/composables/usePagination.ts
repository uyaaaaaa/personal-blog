export const ARTICLES_PER_PAGE = 9

const PAGE_PARAM_PATTERN = /^[1-9]\d*$/

export const usePagination = <T>(items: Ref<T[]>, perPage = ARTICLES_PER_PAGE) => {
	const route = useRoute()

	const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / perPage)))

	const page = computed(() => {
		const requested = route.params.page
		return typeof requested === 'string' && PAGE_PARAM_PATTERN.test(requested)
			? Number(requested)
			: 1
	})

	if (route.params.page !== undefined && (page.value < 2 || page.value > totalPages.value)) {
		throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
	}

	const pagedItems = computed(() =>
		items.value.slice((page.value - 1) * perPage, page.value * perPage),
	)

	const basePath = computed(() => route.path.replace(/\/$/, '').replace(/\/page\/\d+$/, ''))

	return { page, totalPages, pagedItems, basePath }
}
