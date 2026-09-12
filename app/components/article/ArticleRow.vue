<template>
	<li class="border-b border-border">
		<NuxtLink
			:to="path"
			class="group grid grid-cols-list-sm items-baseline gap-x-3 py-3 lg:grid-cols-list lg:gap-x-4"
			prefetch-on="interaction"
		>
			<span class="font-mono text-sm tabular-nums text-sub">{{ sequence }}</span>

			<component
				:is="`h${headingLevel}`"
				class="text-list-title font-medium text-main transition-colors group-hover:text-accent"
			>
				{{ title }}
			</component>

			<div
				class="col-start-2 mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:col-start-3 lg:row-start-1 lg:mt-0 lg:justify-end"
			>
				<time
					class="font-mono text-sm tabular-nums text-sub"
					:datetime="date"
					>{{ formattedDate }}</time
				>
				<span
					v-for="tag in tags"
					:key="tag"
					class="tag font-mono text-xs text-sub lg:hidden"
					>#{{ tag }}</span
				>
			</div>
		</NuxtLink>
	</li>
</template>

<script setup lang="ts">
	import { formatDate } from '~/utils/date'

	interface Props {
		number: number
		title: string
		path: string
		date?: string
		tags?: string[]
		headingLevel?: 2 | 3
	}

	const props = withDefaults(defineProps<Props>(), {
		date: '',
		tags: () => [],
		headingLevel: 2,
	})

	const sequence = computed(() => String(props.number).padStart(2, '0'))

	const formattedDate = computed(() => formatDate(props.date))
</script>
