<template>
	<div
		role="status"
		class="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-card border border-border bg-surface/95 px-4 py-2 text-sm text-main shadow-sm backdrop-blur transition-move lg:hidden"
		:class="isVisible ? 'opacity-100' : 'invisible opacity-0'"
	>
		{{ message }}
	</div>
</template>

<script setup lang="ts">
	import { useToast } from '~/composables/useToast'

	const { message, isVisible } = useToast()

	defineOptions({
		name: 'Toast',
	})
</script>
