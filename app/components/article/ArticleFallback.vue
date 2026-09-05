<script setup lang="ts">
	import BackButton from '~/components/common/BackButton.vue'
	import { formatDate } from '~/utils/date'

	interface Props {
		variant: 'error' | 'not-found'
		path?: string
		// NuxtLoadingIndicatorはルート遷移にしか反応しないため、再試行の進行はここで示す
		pending?: boolean
	}

	const props = defineProps<Props>()

	const emit = defineEmits<{ retry: [] }>()

	const heading = computed(() =>
		props.variant === 'error' ? 'Unable to Load Article' : 'Article Not Found',
	)

	const description = computed(() =>
		props.variant === 'error'
			? 'The connection may be unstable. Please try again in a moment.'
			: 'It may have been removed, or the URL may be incorrect.',
	)

	// 取得失敗時は同じ経路が不調なため、回遊導線は出さない
	const { data: recentArticles } = useLazyAsyncData(
		'article-fallback-recent',
		() =>
			queryCollection('article')
				.where('published', '=', true)
				.order('date', 'DESC')
				.limit(3)
				.all(),
		{ immediate: props.variant === 'not-found', default: () => [] },
	)
</script>

<template>
	<div class="mx-auto max-w-3xl py-8">
		<div
			class="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center"
			:role="variant === 'error' ? 'status' : undefined"
			:aria-busy="variant === 'error' ? String(Boolean(pending)) : undefined"
		>
			<h1 class="text-xl font-bold text-main">{{ heading }}</h1>

			<p
				v-if="variant === 'not-found' && path"
				class="rounded bg-surface-subtle px-2 py-1 font-mono text-xs text-sub"
			>
				{{ path }}
			</p>

			<p class="max-w-sm text-sm text-sub">{{ description }}</p>

			<button
				v-if="variant === 'error'"
				type="button"
				class="mt-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-accent"
				:disabled="pending"
				@click="emit('retry')"
			>
				{{ pending ? 'Retrying...' : 'Retry' }}
			</button>

			<BackButton class="mt-1" />
		</div>

		<section
			v-if="variant === 'not-found' && recentArticles?.length"
			class="mt-10"
		>
			<h2 class="mb-3 font-mono text-xs tracking-wider text-sub">Recent Articles</h2>
			<ul class="flex flex-col">
				<li
					v-for="article in recentArticles"
					:key="article.path"
					class="border-b border-border"
				>
					<NuxtLink
						:to="article.path"
						class="flex flex-col gap-1 py-3 text-sm text-main transition-colors duration-200 hover:text-accent sm:flex-row sm:items-baseline sm:gap-3"
					>
						<span class="flex-none font-mono text-xs text-sub">{{
							formatDate(article.date)
						}}</span>
						<span>{{ article.title }}</span>
					</NuxtLink>
				</li>
			</ul>
		</section>
	</div>
</template>
