<template>
	<section v-if="articles.length">
		<div class="mb-3 flex items-baseline justify-between gap-4">
			<h2 class="font-mono text-ui uppercase tracking-marker text-main">Read Next</h2>
			<NuxtLink
				to="/article"
				class="font-mono text-meta font-medium text-accent hover:underline"
				>All Articles →</NuxtLink
			>
		</div>

		<ArticleList
			:articles="articles"
			:start-number="1"
			:heading-level="3"
		/>
	</section>
</template>

<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'
	import { usePublishedArticles } from '~/composables/usePublishedArticles'
	import { readNextArticles } from '~/utils/readNext'

	const LIMIT = 3

	const props = defineProps<{ currentPath: string }>()

	const { data: candidates } = usePublishedArticles()

	const articles = computed(() => readNextArticles(candidates.value, props.currentPath, LIMIT))
</script>
