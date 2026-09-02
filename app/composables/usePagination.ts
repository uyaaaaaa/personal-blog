import { useScrollTo } from './useScrollTo'

export const ARTICLES_PER_PAGE = 10

export const usePagination = <T>(items: Ref<T[]>, perPage = ARTICLES_PER_PAGE) => {
  const route = useRoute()
  const { scrollToTop } = useScrollTo()
  const page = ref(1)

  const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / perPage)))

  const pagedItems = computed(() =>
    items.value.slice((page.value - 1) * perPage, page.value * perPage),
  )

  const syncFromQuery = () => {
    const requested = Number(route.query.page)
    page.value = Number.isInteger(requested) && requested >= 1
      ? Math.min(requested, totalPages.value)
      : 1
  }

  onMounted(syncFromQuery)
  watch(() => route.query.page, () => {
    syncFromQuery()
    scrollToTop()
  })

  return { page, totalPages, pagedItems }
}
