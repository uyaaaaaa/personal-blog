<script setup lang="ts">
	import { useScrollTo } from '~/composables/useScrollTo'

	const props = defineProps<{
		headingId: string
	}>()

	const { scrollTo } = useScrollTo()

	defineOptions({
		name: 'HeadingAnchor',
	})
</script>

<template>
	<a
		:href="`#${props.headingId}`"
		aria-label="Link to this section"
		class="heading-anchor ml-2 hidden align-middle opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100 lg:inline-block"
		@click.prevent="scrollTo(props.headingId)"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	</a>
</template>

<style scoped>
	/* 本文のリンクとして prose 側の規則も当たるため、色と下線はここで決め切る */
	.heading-anchor {
		color: var(--color-sub);
		text-decoration: none;
	}

	.heading-anchor:hover {
		color: var(--color-accent);
		text-decoration: none;
	}
</style>
