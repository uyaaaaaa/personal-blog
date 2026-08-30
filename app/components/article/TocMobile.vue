<template>
  <div 
    ref="containerRef"
    class="sticky top-[74px] z-40 bg-gray-100 backdrop-blur-sm border border-border rounded-lg overflow-hidden lg:hidden transition-all duration-300"
    :class="{
      'shadow-sm': isSticky,
      '-translate-y-[120px] opacity-0 pointer-events-none': !isVisible
    }"
  >
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

defineProps<{
  links: any[]
}>()

const isOpen = ref(false)
const isSticky = ref(false)

// 下スクロール時は隠し、上スクロール時は表示する（sticky中のみ。メニュー展開中は隠さない）
const { direction } = useScrollDirection()
const isVisible = computed(() => !isSticky.value || isOpen.value || direction.value === 'up')
const containerRef = ref<HTMLElement | null>(null)

// sticky top と同値（CSSの top-[74px] と合わせる）
const STICKY_TOP = 74

const updateSticky = () => {
  const el = containerRef.value
  if (!el) return

  // 非表示アニメーション中は translateY がかかるため、変換前の位置で判定する
  const transform = getComputedStyle(el).transform
  const translateY = transform && transform !== 'none'
    ? new DOMMatrixReadOnly(transform).m42
    : 0

  isSticky.value = el.getBoundingClientRect().top - translateY <= STICKY_TOP + 1
}

onMounted(() => {
  updateSticky()
  window.addEventListener('scroll', updateSticky, { passive: true })
  window.addEventListener('resize', updateSticky, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateSticky)
  window.removeEventListener('resize', updateSticky)
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
