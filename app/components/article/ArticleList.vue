<template>
	<ul class="border-t border-border-strong">
		<ArticleRow
			v-for="(article, offset) in articles"
			:key="article.path"
			:number="startNumber + offset"
			:title="article.title"
			:path="article.path"
			:date="article.date"
			:tags="article.tags"
		/>
	</ul>
</template>

<script setup lang="ts">
	import ArticleRow from '~/components/article/ArticleRow.vue'

	interface Article {
		path: string
		title: string
		date: string
		tags?: string[]
	}

	defineProps<{
		articles: Article[]
		startNumber: number
	}>()
</script>
