<template>
	<div class="space-y-8">
		<div class="flex items-baseline gap-4">
			<h1 class="text-heading font-bold text-main">Digest</h1>
			<span class="font-mono text-total text-sub">{{ entries?.length ?? 0 }}</span>
		</div>

		<ul class="border-t border-border-strong">
			<li
				v-for="entry in entries"
				:key="entry.path"
				class="border-b border-border"
			>
				<NuxtLink
					:to="entry.path"
					class="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
					prefetch-on="interaction"
				>
					<h2
						class="text-list-title font-medium text-main transition-color group-hover:text-accent"
					>
						{{ entry.title }}
					</h2>

					<time
						class="font-mono text-ui tabular-nums text-sub"
						:datetime="entry.date"
						>{{ formatDate(entry.date) }}</time
					>
				</NuxtLink>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
	import { usePageSeo } from '~/composables/usePageSeo'
	import { formatDate } from '~/utils/date'
	import { digestList } from '~/utils/digestQuery'

	const route = useRoute()

	const { data: entries } = await useAsyncData('digest-list', () => digestList().all())

	usePageSeo({
		path: () => route.path,
		title: 'Digest',
		description: '自動で集めた内容の一覧。',
		noindex: true,
	})
</script>
