<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useScrollTo } from '~/composables/useScrollTo'

const FADE_DISTANCE = 240

const opacity = ref(0)

const updateOpacity = () => {
  const showFrom = Math.max(window.innerHeight, document.documentElement.scrollHeight / 3)
  const progress = (window.scrollY - showFrom) / FADE_DISTANCE

  opacity.value = Math.min(Math.max(progress, 0), 1)
}

onMounted(() => {
  updateOpacity()
  window.addEventListener('scroll', updateOpacity, { passive: true })
  window.addEventListener('resize', updateOpacity, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateOpacity)
  window.removeEventListener('resize', updateOpacity)
})

const { scrollToTop, clearHash } = useScrollTo()
</script>

<template>
  <button
    v-if="opacity > 0"
    type="button"
    aria-label="Back to top"
    :style="{ opacity }"
    class="fixed bottom-6 right-6 z-30 flex lg:hidden h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/90 text-sub shadow-sm backdrop-blur transition-colors duration-200 hover:border-accent hover:text-accent group"
    @click="scrollToTop(); clearHash()"
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
      class="group-hover:-translate-y-0.5 transition-transform duration-200"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  </button>
</template>
