<template>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		:class="ICON_SIZE_CLASS[size]"
	>
		<slot />
	</svg>
</template>

<script lang="ts">
	const ICON_SIZE_CLASS = {
		small: 'h-icon-small w-icon-small',
		base: 'h-icon w-icon',
		large: 'h-icon-large w-icon-large',
	} as const

	export type IconSize = keyof typeof ICON_SIZE_CLASS
</script>

<script setup lang="ts">
	withDefaults(defineProps<{ size?: IconSize }>(), { size: 'base' })
</script>
