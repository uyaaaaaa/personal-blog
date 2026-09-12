<template>
	<div class="mx-auto max-w-column py-16">
		<p class="font-mono text-sm tracking-marker text-accent">■ {{ code }}</p>
		<h1 class="mt-4 text-heading font-bold text-main">{{ message }}</h1>
		<p class="mt-3 text-sm text-sub">{{ description }}</p>

		<nav class="mt-8 flex flex-col items-start gap-2">
			<NuxtLink
				to="/"
				class="font-mono text-sm font-medium text-accent hover:underline"
				>Home →</NuxtLink
			>
			<NuxtLink
				to="/article"
				class="font-mono text-sm font-medium text-accent hover:underline"
				>All articles →</NuxtLink
			>
		</nav>

		<section
			v-if="recentArticles?.length"
			class="mt-12"
		>
			<h2 class="mb-3 font-mono text-xs tracking-marker text-sub">LATEST</h2>
			<ul class="flex flex-col border-t border-border">
				<li
					v-for="article in recentArticles"
					:key="article.path"
					class="border-b border-border"
				>
					<NuxtLink
						:to="article.path"
						class="flex flex-col gap-1 py-3 text-sm text-main transition-colors hover:text-accent md:flex-row md:items-baseline md:gap-4"
						prefetch-on="interaction"
					>
						<time
							class="flex-none font-mono text-xs text-sub"
							:datetime="article.date"
							>{{ formatDate(article.date) }}</time
						>
						<span>{{ article.title }}</span>
					</NuxtLink>
				</li>
			</ul>
		</section>
	</div>
</template>

<script setup lang="ts">
	import { formatDate } from '~/utils/date'

	const RECENT_LIMIT = 3

	defineProps<{
		code: number | string
		message: string
		description: string
	}>()

	// 静的生成の 404 / 500 は SPA の殻から描かれる。待って取るとエラーの文面ごと遅れる
	const { data: recentArticles } = useLazyAsyncData(
		'error-view-recent',
		() =>
			queryCollection('article')
				.where('published', '=', true)
				.order('date', 'DESC')
				.limit(RECENT_LIMIT)
				.select('path', 'title', 'date')
				.all(),
		{ default: () => [] },
	)
</script>
