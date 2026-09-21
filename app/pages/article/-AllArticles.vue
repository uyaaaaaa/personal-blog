<template>
	<ArticleIndex :list="list">
		<template #heading>Articles</template>
		<template #filter>
			<CategoryFilter :current="null" />
		</template>
	</ArticleIndex>
</template>

<script setup lang="ts">
	import ArticleIndex from '~/components/article/ArticleIndex.vue'
	import CategoryFilter from '~/components/article/CategoryFilter.vue'
	import { useArticleIndex } from '~/composables/useArticleIndex'
	import { publishedArticleList } from '~/utils/articleQuery'

	const route = useRoute()

	const { data: articles } = await useAsyncData('article-list', () =>
		publishedArticleList().all(),
	)

	const list = useArticleIndex({
		articles: computed(() => articles.value ?? []),
		pageParam: () => route.params.page,
		path: () => route.path,
		title: 'Articles',
		description: '公開中の記事の一覧。',
	})
</script>
