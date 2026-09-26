<template>
	<ArticleIndex
		:list="list"
		mono-heading
	>
		<template #heading> <span class="text-accent">#</span>{{ tag.name }} </template>
	</ArticleIndex>
</template>

<script setup lang="ts">
	import ArticleIndex from '~/components/article/ArticleIndex.vue'
	import { useArticleIndex } from '~/composables/useArticleIndex'
	import { useArticleTags } from '~/composables/useArticleTags'
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

	const list = useArticleIndex({
		articles: computed(() => articles.value ?? []),
		pageParam: () => route.params.page,
		path: () => route.path,
		title: `#${tag.name}`,
		description: `${tag.name} タグが付いた記事の一覧。`,
	})
</script>
