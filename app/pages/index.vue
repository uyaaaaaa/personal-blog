<template>
	<div class="mx-auto w-full max-w-column space-y-16">
		<Hero
			v-if="heroArticle"
			:article="heroArticle"
		/>

		<ArticleShelf
			v-for="shelf in shelves"
			:key="shelf.category"
			:title="shelf.title"
			:articles="shelf.articles"
			:total="shelf.total"
			:view-all-path="`/category/${shelf.category}`"
		/>
	</div>
</template>

<script setup lang="ts">
	import Hero from '~/components/article/Hero.vue'
	import ArticleShelf from '~/components/article/ArticleShelf.vue'
	import { usePageSeo } from '~/composables/usePageSeo'
	import { buildShelves } from '~/utils/shelf'

	const SHELF_LIMIT = 6

	const route = useRoute()

	const { data: articles } = await useAsyncData('home-articles', () =>
		queryCollection('article')
			.where('published', '=', true)
			.order('date', 'DESC')
			.select('path', 'title', 'description', 'date', 'emoji', 'image', 'tags', 'category')
			.all(),
	)

	const heroArticle = computed(() => articles.value?.[0] ?? null)

	const shelves = computed(() =>
		buildShelves(articles.value ?? [], heroArticle.value?.path, SHELF_LIMIT),
	)

	usePageSeo({ path: () => route.path })
</script>
