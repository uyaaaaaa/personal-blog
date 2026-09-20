<template>
	<div class="space-y-8">
		<div class="flex items-baseline gap-4">
			<h1 class="font-mono text-heading font-bold text-main">
				<span class="text-accent">#</span>{{ tag.name }}
			</h1>
			<span class="font-mono text-total text-sub">{{ articles?.length ?? 0 }}</span>
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

<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'
	import Pagination from '~/components/ui/Pagination.vue'
	import { useArticleTags } from '~/composables/useArticleTags'
	import { usePagination } from '~/composables/usePagination'
	import { usePageSeo } from '~/composables/usePageSeo'
	import { articlesTaggedWith } from '~/utils/articleQuery'

	const route = useRoute()
	const slug = String(route.params.tag)

	const { data: tags } = await useArticleTags()
	const tag = (tags.value ?? []).find((it) => it.slug === slug)

	if (!tag) {
		throw createError({ statusCode: 404, statusMessage: 'Tag not found', fatal: true })
	}

	const { data: articles } = await useAsyncData(`tag-articles-${slug}`, () =>
		articlesTaggedWith(tag.name),
	)

	const { page, totalPages, pagedItems, startNumber, basePath } = usePagination(
		computed(() => articles.value ?? []),
		{
			pageParam: () => route.params.page,
			path: () => route.path,
		},
	)

	usePageSeo({
		path: () => route.path,
		title: () =>
			page.value > 1 ? `#${tag.name} (${page.value}/${totalPages.value})` : `#${tag.name}`,
		description: `${tag.name} タグが付いた記事の一覧。`,
	})
</script>
