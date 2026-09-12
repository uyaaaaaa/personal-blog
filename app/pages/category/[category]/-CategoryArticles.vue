<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'
	import Pagination from '~/components/ui/Pagination.vue'
	import { usePagination } from '~/composables/usePagination'
	import { usePageSeo } from '~/composables/usePageSeo'
	import { isCategory, CATEGORY_LABELS } from '~/utils/category'

	const route = useRoute()
	const category = String(route.params.category)

	if (!isCategory(category)) {
		throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
	}

	const label = CATEGORY_LABELS[category]

	const { data: articles } = await useAsyncData(`category-articles-${category}`, () =>
		queryCollection('article')
			.where('published', '=', true)
			.where('category', '=', category)
			.order('date', 'DESC')
			.select('path', 'title', 'date', 'tags')
			.all(),
	)

	if ((articles.value ?? []).length === 0) {
		throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
	}

	const { page, totalPages, pagedItems, startNumber, basePath } = usePagination(
		computed(() => articles.value ?? []),
		{ pageParam: () => route.params.page, path: () => route.path },
	)

	usePageSeo({
		path: () => route.path,
		title: () => (page.value > 1 ? `${label} (${page.value}/${totalPages.value})` : label),
		description: `${label} カテゴリの記事一覧。`,
	})
</script>

<template>
	<div class="mx-auto w-full max-w-column space-y-8">
		<div class="flex items-baseline gap-4">
			<h1 class="text-3xl font-bold text-main">{{ label }}</h1>
			<span class="font-mono text-base text-sub">{{ articles?.length ?? 0 }}</span>
		</div>

		<ArticleList
			:articles="pagedItems"
			:start-number="startNumber"
		/>

		<Pagination
			:page="page"
			:total-pages="totalPages"
			:base-path="basePath"
		/>
	</div>
</template>
