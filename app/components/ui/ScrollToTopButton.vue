<template>
	<button
		v-if="opacity > 0"
		type="button"
		aria-label="Scroll to top"
		:style="{ '--scroll-to-top-opacity': opacity }"
		class="scroll-to-top group fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/90 text-sub shadow-sm backdrop-blur transition-color hover:border-accent hover:text-accent lg:hidden"
		@click="handleScrollToTop"
	>
		<ChevronUpIcon class="transition-move group-hover:-translate-y-0.5" />
	</button>
</template>

<script setup lang="ts">
	import ChevronUpIcon from '~/components/ui/ChevronUpIcon.vue'
	import { useScrollTo } from '~/composables/useScrollTo'
	import { useIsDesktop } from '~/composables/useIsDesktop'
	import { useScrollFrame } from '~/composables/useScrollFrame'

	const FADE_DISTANCE = 240

	const opacity = ref(0)

	const updateOpacity = () => {
		const showFrom = Math.max(window.innerHeight, document.documentElement.scrollHeight / 3)
		const progress = (window.scrollY - showFrom) / FADE_DISTANCE

		opacity.value = Math.min(Math.max(progress, 0), 1)
	}

	const { isMobile } = useIsDesktop()

	useScrollFrame(updateOpacity, isMobile)

	const { scrollToTop, clearHash } = useScrollTo()

	const handleScrollToTop = () => {
		scrollToTop()
		clearHash()
	}
</script>

<style scoped>
	.scroll-to-top {
		opacity: var(--scroll-to-top-opacity);
	}
</style>
