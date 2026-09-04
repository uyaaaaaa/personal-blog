<script setup lang="ts">
	interface Props {
		to?: string | object
		label?: string
	}

	withDefaults(defineProps<Props>(), {
		to: '/article',
		label: 'Back to Articles',
	})
</script>

<template>
	<NuxtLink
		:to="to"
		class="group inline-flex items-center gap-2 text-sm text-sub transition-colors duration-200 hover:text-accent"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="transition-transform duration-200 group-hover:-translate-x-1"
		>
			<path d="M19 12H5" />
			<path d="M12 19l-7-7 7-7" />
		</svg>
		<span>{{ label }}</span>
	</NuxtLink>
</template>
