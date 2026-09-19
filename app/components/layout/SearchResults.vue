<template>
	<ul
		:id="id"
		ref="listRef"
		class="search-results"
		role="listbox"
		aria-label="Search results"
	>
		<li
			v-for="(article, index) in results"
			:key="article.path"
			role="presentation"
		>
			<NuxtLink
				:id="optionId(index)"
				:to="article.path"
				class="search-result border-l-2 border-l-transparent"
				:class="{ 'is-active md:border-l-accent': index === activeIndex }"
				role="option"
				:aria-selected="index === activeIndex"
				prefetch-on="interaction"
				@click="emit('select')"
				@pointermove="emit('activate', index)"
			>
				<span class="search-result-title">{{ article.title }}</span>
				<time
					class="search-result-date"
					:datetime="article.date"
					>{{ formatDate(article.date) }}</time
				>
			</NuxtLink>
		</li>
	</ul>
</template>

<script setup lang="ts">
	import { formatDate } from '~/utils/date'
	import { deltaToReveal } from '~/utils/scroll'

	interface ResultArticle {
		path: string
		title: string
		date: string
	}

	const props = defineProps<{
		id: string
		results: ResultArticle[]
		activeIndex: number
	}>()

	const emit = defineEmits<{
		(e: 'select'): void
		(e: 'activate', index: number): void
	}>()

	const listRef = ref<HTMLElement | null>(null)

	const optionId = (index: number) => `${props.id}-${index}`

	watch(
		() => props.results,
		() => {
			if (listRef.value) listRef.value.scrollTop = 0
		},
	)

	watch(
		() => props.activeIndex,
		async () => {
			await nextTick()

			const container = listRef.value
			const active = container?.querySelector<HTMLElement>('.is-active')
			if (!container || !active) return

			container.scrollTop += deltaToReveal(
				container.getBoundingClientRect(),
				active.getBoundingClientRect(),
			)
		},
	)
</script>

<style scoped>
	.search-results {
		list-style: none;
		min-height: 0;
		margin: 0;
		padding: 0.5rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.search-result {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		/* 縦線は幅で出し分けるので border-left は Tailwind 側だけに置く。ここに書くと
		   scoped の詳細度が md: のクラスに勝ち、色が黙って出なくなる */
		border-radius: 0.375rem;
		color: var(--color-main);
		transition: background-color 0.15s;
	}

	.search-result:hover,
	.search-result.is-active {
		background-color: var(--color-surface-subtle);
	}

	.search-result-title {
		flex: 1;
		min-width: 0;
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.search-result-date {
		flex: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
		font-variant-numeric: tabular-nums;
	}
</style>
