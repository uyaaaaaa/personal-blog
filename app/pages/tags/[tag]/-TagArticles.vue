<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'
	import Pagination from '~/components/ui/Pagination.vue'
	import { usePagination } from '~/composables/usePagination'
	import { usePageSeo } from '~/composables/usePageSeo'
	import { tagToSlug } from '~/utils/tag'

	const route = useRoute()
	const slug = computed(() => String(route.params.tag))

	const { data: articles } = await useAsyncData(`tag-articles-${slug.value}`, () =>
		queryCollection('article')
			.where('published', '=', true)
			.order('date', 'DESC')
			.select('path', 'title', 'date', 'tags')
			.all(),
	)

	const filteredArticles = computed(() =>
		(articles.value ?? []).filter((article) =>
			(article.tags ?? []).some((tag) => tagToSlug(tag) === slug.value),
		),
	)

	const tagName = computed(() => {
		for (const article of articles.value ?? []) {
			const matched = (article.tags ?? []).find((tag) => tagToSlug(tag) === slug.value)
			if (matched) return matched
		}
		return slug.value
	})

	if (filteredArticles.value.length === 0) {
		throw createError({ statusCode: 404, statusMessage: 'Tag not found', fatal: true })
	}

	const { page, totalPages, pagedItems, startNumber, basePath } = usePagination(
		filteredArticles,
		{
			pageParam: () => route.params.page,
			path: () => route.path,
		},
	)

	usePageSeo({
		path: () => route.path,
		title: () =>
			page.value > 1
				? `#${tagName.value} (${page.value}/${totalPages.value})`
				: `#${tagName.value}`,
		description: () => `${tagName.value} タグが付いた記事の一覧。`,
	})
</script>

<template>
	<div class="mx-auto w-full max-w-column space-y-8">
		<div class="flex items-baseline gap-4">
			<h1 class="font-mono text-heading font-bold text-main">
				<span class="text-accent">#</span>{{ tagName }}
			</h1>
			<span class="font-mono text-base text-sub">{{ filteredArticles.length }}</span>
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
