<template>
	<div
		ref="host"
		class="prose-table-scroll"
		v-bind="region"
	>
		<table>
			<slot />
		</table>
	</div>
</template>

<script setup lang="ts">
	import { useScrollableRegion } from '~/composables/useScrollableRegion'

	defineOptions({
		name: 'ProseTable',
	})

	const host = ref<HTMLElement | null>(null)
	const region = useScrollableRegion(host, 'Table')
</script>

<style scoped>
	/* @tailwindcss/typography は pre と違い table にスクロール領域を与えないため、ここで持たせる */
	.prose-table-scroll {
		overflow-x: auto;
	}
</style>
