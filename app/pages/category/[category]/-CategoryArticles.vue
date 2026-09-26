<template>
	<ArticleIndex :list="list">
		<template #heading>
			<span lang="en">{{ label }}</span>
		</template>
		<template #filter>
			<CategoryFilter :current="category" />
		</template>
	</ArticleIndex>
</template>

<script setup lang="ts">
	import ArticleIndex from '~/components/article/ArticleIndex.vue'
	import CategoryFilter from '~/components/article/CategoryFilter.vue'
	import { useArticleIndex } from '~/composables/useArticleIndex'
	import { publishedArticleList } from '~/utils/articleQuery'
	import { isCategory, CATEGORY_LABELS } from '~/utils/category'

	const route = useRoute()
	const category = String(route.params.category)

	if (!isCategory(category)) {
		throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
	}

	const label = CATEGORY_LABELS[category]

	const { data: articles } = await useAsyncData(`category-articles-${category}`, () =>
		publishedArticleList().where('category', '=', category).all(),
	)

	if ((articles.value ?? []).length === 0) {
		throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
	}

	const list = useArticleIndex({
		articles: computed(() => articles.value ?? []),
		pageParam: () => route.params.page,
		path: () => route.path,
		title: label,
		description: `${label} カテゴリの記事一覧。`,
	})
</script>
