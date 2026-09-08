<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'
	import Pagination from '~/components/common/Pagination.vue'
	import { usePagination } from '~/composables/usePagination'
	import { usePageSeo } from '~/composables/usePageSeo'

	const route = useRoute()

	const { data: articles } = await useAsyncData('article-list', () =>
		queryCollection('article')
			.where('published', '=', true)
			.order('date', 'DESC')
			.select('path', 'title', 'date', 'emoji', 'tags')
			.all(),
	)

	const { page, totalPages, pagedItems, basePath } = usePagination(
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
	<div class="space-y-8">
		<header class="border-b border-border pb-8">
			<h1 class="mb-2 text-3xl font-bold text-main">Articles</h1>
			<p class="text-sub">All tech articles and book reviews.</p>
		</header>

		<ArticleList :articles="pagedItems" />

		<Pagination
			:page="page"
			:total-pages="totalPages"
			:base-path="basePath"
		/>
	</div>
</template>
