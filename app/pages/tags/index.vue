<script setup lang="ts">
	import { useArticleTags } from '~/composables/useArticleTags'
	import { usePageSeo } from '~/composables/usePageSeo'

	const route = useRoute()

	const { data: tags } = useArticleTags()

	usePageSeo({
		path: () => route.path,
		title: 'Tags',
		description: '記事に付けられたタグの一覧。',
	})
</script>

<template>
	<div class="mx-auto w-full max-w-column space-y-8">
		<div class="flex items-baseline gap-4">
			<h1 class="text-heading font-bold text-main">Tags</h1>
			<span class="font-mono text-base text-sub">{{ tags?.length ?? 0 }}</span>
		</div>

		<div class="flex flex-wrap gap-3">
			<NuxtLink
				v-for="tag in tags"
				:key="tag.slug"
				:to="`/tags/${tag.slug}`"
				class="flex items-baseline gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-sm text-main transition-colors hover:border-main"
			>
				<span>{{ tag.name }}</span>
				<span class="text-xs text-accent">{{ tag.count }}</span>
			</NuxtLink>
		</div>
	</div>
</template>
