<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'
	import Pagination from '~/components/ui/Pagination.vue'
	import { usePagination } from '~/composables/usePagination'
	import { usePageSeo } from '~/composables/usePageSeo'

	const route = useRoute()

	const { data: articles } = await useAsyncData('article-list', () =>
		queryCollection('article')
			.where('published', '=', true)
			.order('date', 'DESC')
			.select('path', 'title', 'date', 'tags')
			.all(),
	)

	const { page, totalPages, pagedItems, startNumber, basePath } = usePagination(
		computed(() => articles.value ?? []),
		{ pageParam: () => route.params.page, path: () => route.path },
	)

	usePageSeo({
		path: () => route.path,
		title: () => (page.value > 1 ? `Articles (${page.value}/${totalPages.value})` : 'Articles'),
		description: '公開中の記事の一覧。',
	})
</script>

<template>
	<div class="mx-auto w-full max-w-column space-y-8">
		<div class="flex items-baseline gap-4">
			<h1 class="text-3xl font-bold text-main">Articles</h1>
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
