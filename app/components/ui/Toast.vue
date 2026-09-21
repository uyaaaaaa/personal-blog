<template>
	<div
		role="status"
		class="pointer-events-none fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-card border border-border bg-surface/95 px-4 py-2 text-ui text-main shadow-sm backdrop-blur transition-move lg:hidden"
		:class="isVisible ? 'opacity-100' : 'invisible opacity-0'"
	>
		<CheckIcon class="shrink-0" />
		{{ message }}
	</div>
</template>

<script setup lang="ts">
	import CheckIcon from '~/components/ui/CheckIcon.vue'
	import { useToast } from '~/composables/useToast'

	const { message, isVisible } = useToast()

	defineOptions({
		name: 'Toast',
	})
</script>
