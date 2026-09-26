<template>
	<nav
		v-if="totalPages > 1"
		class="flex items-center justify-center gap-2"
		aria-label="Pagination"
		lang="en"
	>
		<NuxtLink
			v-if="page > 1"
			:to="linkFor(page - 1)"
			class="page-item"
			aria-label="Previous page"
		>
			<ChevronLeftIcon />
		</NuxtLink>
		<span
			v-else
			class="page-item page-item-disabled"
			aria-hidden="true"
		>
			<ChevronLeftIcon />
		</span>

		<template
			v-for="(item, index) in items"
			:key="`${item}-${index}`"
		>
			<span
				v-if="item === 'gap'"
				class="px-1 font-mono text-ui text-sub"
				>…</span
			>
			<NuxtLink
				v-else-if="item !== page"
				:to="linkFor(item)"
				class="page-item"
			>
				{{ item }}
			</NuxtLink>
			<span
				v-else
				class="page-item page-item-current"
				aria-current="page"
				>{{ item }}</span
			>
		</template>

		<NuxtLink
			v-if="page < totalPages"
			:to="linkFor(page + 1)"
			class="page-item"
			aria-label="Next page"
		>
			<ChevronRightIcon />
		</NuxtLink>
		<span
			v-else
			class="page-item page-item-disabled"
			aria-hidden="true"
		>
			<ChevronRightIcon />
		</span>
	</nav>
</template>

<script setup lang="ts">
	import ChevronLeftIcon from '~/components/ui/ChevronLeftIcon.vue'
	import ChevronRightIcon from '~/components/ui/ChevronRightIcon.vue'
	import { pageLink, paginationItems } from '~/utils/pagination'

	const props = defineProps<{
		page: number
		totalPages: number
		basePath: string
	}>()

	const WINDOW_RADIUS = 1

	const items = computed(() => paginationItems(props.page, props.totalPages, WINDOW_RADIUS))

	const linkFor = (target: number) => pageLink(props.basePath, target)
</script>

<style scoped>
	.page-item {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		height: 2.25rem;
		padding: 0 0.5rem;
		color: var(--color-main);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		transition: color 0.15s var(--ease-change);
	}

	a.page-item:hover {
		color: var(--color-accent);
	}

	.page-item-current {
		color: var(--color-accent);
		text-decoration: underline;
		text-underline-offset: 0.25rem;
	}

	.page-item-disabled {
		color: var(--color-sub);
	}
</style>
