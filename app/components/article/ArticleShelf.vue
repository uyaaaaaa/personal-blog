<template>
	<section>
		<div class="mb-3 flex items-baseline justify-between gap-4">
			<h2 class="font-mono text-sm uppercase tracking-marker text-main">
				<NuxtLink
					:to="viewAllPath"
					class="transition-colors hover:text-accent"
					>{{ title }}</NuxtLink
				>
			</h2>
			<NuxtLink
				v-if="hasMore"
				:to="viewAllPath"
				class="font-mono text-xs font-medium text-accent hover:underline"
				>View All →</NuxtLink
			>
		</div>

		<ArticleList
			:articles="articles"
			:start-number="1"
		/>
	</section>
</template>

<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'

	interface Article {
		path: string
		title: string
		date: string
		tags?: string[]
	}

	const props = defineProps<{
		title: string
		articles: Article[]
		total: number
		viewAllPath: string
	}>()

	const hasMore = computed(() => props.total > props.articles.length)
</script>
