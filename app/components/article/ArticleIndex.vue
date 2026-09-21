<template>
	<div class="space-y-8">
		<div class="flex items-baseline gap-4">
			<h1
				class="text-heading font-bold text-main"
				:class="{ 'font-mono': monoHeading }"
			>
				<slot name="heading" />
			</h1>
			<span class="font-mono text-total text-sub">{{ list.total }}</span>
		</div>

		<slot name="filter" />

		<ArticleList
			:articles="list.articles"
			:start-number="list.startNumber"
		/>

		<Pagination
			:page="list.page"
			:total-pages="list.totalPages"
			:base-path="list.basePath"
		/>
	</div>
</template>

<script setup lang="ts">
	import ArticleList from '~/components/article/ArticleList.vue'
	import Pagination from '~/components/ui/Pagination.vue'
	import type { ArticleIndexView } from '~/composables/useArticleIndex'

	defineProps<{
		list: ArticleIndexView
		monoHeading?: boolean
	}>()
</script>
