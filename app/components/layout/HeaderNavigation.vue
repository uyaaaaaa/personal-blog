<template>
	<div class="flex items-stretch">
		<HeaderExploreMenu
			:groups="menuGroups"
			:location="location"
		/>

		<HeaderDrawer
			:is-open="isOpen"
			:groups="menuGroups"
			@toggle="emit('toggle')"
			@close="emit('close')"
		/>
	</div>
</template>

<script setup lang="ts">
	import HeaderDrawer from '~/components/layout/HeaderDrawer.vue'
	import HeaderExploreMenu from '~/components/layout/HeaderExploreMenu.vue'
	import { useArticleCategories } from '~/composables/useArticleCategories'
	import { useArticleTags } from '~/composables/useArticleTags'
	import { useLatestArticles } from '~/composables/useLatestArticles'
	import { formatRelativeDate } from '~/utils/date'
	import { buildMenuGroups } from '~/utils/menuGroup'
	import type { MenuArticle } from '~/utils/menuArticle'

	defineProps<{
		isOpen: boolean
		location: string
	}>()

	const emit = defineEmits<{
		(e: 'toggle'): void
		(e: 'close'): void
	}>()

	const TOP_TAGS_LIMIT = 10
	const LATEST_ARTICLES_LIMIT = 5

	const { data: categories } = useArticleCategories()

	const { data: tags } = useArticleTags()
	const topTags = computed(() => (tags.value ?? []).slice(0, TOP_TAGS_LIMIT))

	const { data: latestArticles } = useLatestArticles(LATEST_ARTICLES_LIMIT)

	const now = ref<number | null>(null)

	const latestItems = computed<MenuArticle[]>(() =>
		(latestArticles.value ?? []).map((article) => ({
			...article,
			dateLabel: formatRelativeDate(article.date, now.value),
		})),
	)

	onMounted(() => {
		now.value = Date.now()
	})

	const menuGroups = computed(() =>
		buildMenuGroups({
			categories: categories.value ?? [],
			latestItems: latestItems.value,
			topTags: topTags.value,
		}),
	)
</script>
