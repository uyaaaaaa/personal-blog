<template>
	<NuxtLink
		:to="path"
		class="article-card flex flex-col gap-3 rounded-[10px] border border-border bg-surface p-4 transition-shadow duration-200 hover:shadow-sm md:p-5"
	>
		<div class="flex items-center justify-between">
			<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted">
				<span class="text-[28px] leading-none">{{ emoji }}</span>
			</div>
			<time
				class="font-mono text-sm text-sub"
				:datetime="date"
				>{{ formattedDate }}</time
			>
		</div>

		<h3 class="line-clamp-2 min-h-[2.6em] text-base font-bold leading-snug text-main">
			{{ title }}
		</h3>

		<div class="mt-auto flex flex-wrap gap-1.5">
			<span
				v-for="tag in tags"
				:key="tag"
				class="tag rounded border border-accent bg-surface px-2 py-0.5 font-mono text-xs text-accent"
			>
				{{ tag }}
			</span>
		</div>
	</NuxtLink>
</template>

<script setup lang="ts">
	import { formatDate } from '~/utils/date'

	interface Props {
		title: string
		path: string
		date?: string
		emoji?: string
		tags?: string[]
	}

	const props = withDefaults(defineProps<Props>(), {
		date: '',
		emoji: '📝',
		tags: () => [],
	})

	const formattedDate = computed(() => {
		return formatDate(props.date)
	})
</script>

<style scoped>
	.article-card:hover h3 {
		color: var(--color-accent);
	}

	.article-card:hover {
		border-color: var(--color-accent);
	}
</style>
