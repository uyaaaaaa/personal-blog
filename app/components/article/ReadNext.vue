<template>
	<section v-if="articles.length">
		<div class="mb-3 flex items-baseline justify-between gap-4">
			<h2 class="font-mono text-sm uppercase tracking-marker text-main">Read Next</h2>
			<NuxtLink
				to="/article"
				class="font-mono text-xs font-medium text-accent hover:underline"
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
	import { readNextArticles } from '~/utils/readNext'

	const LIMIT = 3

	const props = defineProps<{ currentPath: string }>()

	// 取得は記事をまたいで同じキーを共有するので、props で絞り込むと最初に生成した
	// 記事の結果が全ページに出る。現在地での絞り込みは readNextArticles が行う
	const { data: candidates } = useAsyncData(
		'read-next-articles',
		() =>
			queryCollection('article')
				.where('published', '=', true)
				.order('date', 'DESC')
				.select('path', 'title', 'date', 'tags', 'category')
				.all(),
		{ default: () => [] },
	)

	const articles = computed(() => readNextArticles(candidates.value, props.currentPath, LIMIT))
</script>
