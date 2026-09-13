<template>
	<section
		class="border-b border-t-2 border-b-border-strong border-t-accent py-8 md:grid md:grid-cols-pickup md:gap-x-6"
	>
		<div
			class="flex items-baseline gap-3 font-mono text-xs tracking-marker md:flex-col md:gap-1.5"
		>
			<p class="flex gap-2 text-accent">
				<span aria-hidden="true">■</span>
				<span>PICKUP</span>
			</p>
			<time
				class="tabular-nums text-sub"
				:datetime="article.date"
				>{{ formattedDate }}</time
			>
		</div>

		<div class="mt-4 md:mt-0">
			<h1 class="text-hero-sm font-bold text-main md:text-hero">
				<NuxtLink
					:to="article.path"
					class="transition-colors hover:text-accent"
					prefetch-on="interaction"
					>{{ article.title }}</NuxtLink
				>
			</h1>

			<p
				v-if="article.description"
				class="mt-3 leading-relaxed text-sub"
			>
				{{ article.description }}
			</p>

			<div
				v-if="article.tags?.length"
				class="mt-3 flex flex-wrap gap-x-3 gap-y-1"
			>
				<span
					v-for="tag in article.tags"
					:key="tag"
					class="tag font-mono text-xs text-sub"
					>#{{ tag }}</span
				>
			</div>

			<NuxtLink
				:to="article.path"
				class="mt-5 inline-block font-mono text-sm font-medium text-accent hover:underline"
				prefetch-on="interaction"
				>Read →</NuxtLink
			>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { formatDate } from '~/utils/date'

	interface Article {
		path: string
		title: string
		description?: string
		date: string
		tags?: string[]
	}

	const props = defineProps<{
		article: Article
	}>()

	const formattedDate = computed(() => formatDate(props.article.date))
</script>
