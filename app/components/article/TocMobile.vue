<template>
  <div 
    ref="containerRef"
    class="sticky top-[74px] z-40 bg-gray-100 backdrop-blur-sm border border-border rounded-lg overflow-hidden lg:hidden transition-all duration-300"
    :class="{ 'shadow-sm': isSticky }"
  >
    <!-- Sentinel for detecting sticky state -->
    <div ref="sentinelRef" class="absolute -top-[75px] w-full h-[1px] pointer-events-none opacity-0"></div>

    <button 
      @click="isOpen = !isOpen"
      class="w-full px-4 py-3 flex items-center justify-between gap-2 text-sm text-main transition-colors text-left font-medium"
    >
      <span>目次</span>
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
        class="transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <div 
      v-show="isOpen" 
      :class="[
        'w-full bg-white border-t border-border overflow-y-auto transition-all duration-200',
        isSticky 
          ? 'absolute top-full left-0 shadow-lg max-h-[60vh] rounded-b-lg -mt-[1px] border-x border-b' 
          : 'relative max-h-none'
      ]"
    >
      <nav class="py-2 px-4 pb-4">
        <ul class="space-y-1">
          <li v-for="link in links" :key="link.id">
            <a 
              :href="`#${link.id}`" 
              @click.prevent="handleClick(link.id)"
              class="block py-1.5 text-sm text-sub hover:text-accent border-l-2 border-transparent hover:border-accent pl-3 -ml-[1px]"
            >
              {{ link.text }}
            </a>
            <ul v-if="link.children && link.children.length > 0" class="ml-2 mt-1 space-y-1">
              <li v-for="child in link.children" :key="child.id">
                 <a 
                  :href="`#${child.id}`" 
                  @click.prevent="handleClick(child.id)"
                  class="block py-1.5 text-xs text-sub hover:text-accent pl-3 border-l-2 border-transparent hover:border-accent -ml-[1px]"
                >
                  {{ child.text }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </div>
    
    <!-- Backdrop to close when clicking outside (Only show when sticky) -->
    <div 
      v-if="isOpen && isSticky" 
      class="fixed inset-0 top-[calc(64px+41px)] z-[-1] bg-black/20"
      @click="isOpen = false"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

defineProps<{
  links: any[]
}>()

const isOpen = ref(false)
const isSticky = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!sentinelRef.value) return

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) return
      
      // Actually, with sticky detection via sentinel:
      // When sentinel is hidden above the viewport, we are sticky.
      isSticky.value = !entry.isIntersecting && entry.boundingClientRect.top < 0
    },
    {
      // Adjust threshold or rootMargin if needed. 
      // Since header is 64px and top is 74px, we want to know when we hit that 74px mark.
      // The sentinel is at -75px. 
      threshold: 0,
      rootMargin: '-74px 0px 0px 0px' 
    }
  )

  observer.observe(sentinelRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const { scrollTo } = useScrollTo()

const handleClick = async (id: string) => {
  // Close menu first
  isOpen.value = false
  
  // Wait for DOM update to get the correct collapsed height
  await nextTick()
  
  // Header (64) + Gap (10)
  const headerOffset = 64 + 10
  
  // Dynamic TOC height (should be collapsed height now)
  const tocHeight = containerRef.value?.offsetHeight || 45
  
  // Buffer
  const buffer = 20
  
  const offset = headerOffset + tocHeight + buffer
  
  scrollTo(id, offset)
}
</script>
