<script setup lang="ts">
import { ref } from 'vue'
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

const backToTop = () => {
  scrollToTop()
  clearHash()
}
</script>

<template>
  <button
    v-if="opacity > 0"
    type="button"
    aria-label="Back to top"
    :style="{ opacity }"
    class="group fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/90 text-sub shadow-sm backdrop-blur transition-colors duration-200 hover:border-accent hover:text-accent lg:hidden"
    @click="backToTop"
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
      class="transition-transform duration-200 group-hover:-translate-y-0.5"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  </button>
</template>
