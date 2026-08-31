<template>
  <div 
    ref="containerRef"
    class="sticky top-[74px] z-40 bg-gray-100 backdrop-blur-sm border border-border rounded-lg lg:hidden transition-all duration-300"
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

    <!-- Dropdown: 記事コンテンツを押し下げず、常にオーバーレイで表示する -->
    <!-- overscroll-contain: 目次内スクロールが端に達しても背後のページまでスクロールさせない -->
    <div
      v-show="isOpen"
      ref="dropdownRef"
      class="absolute top-full left-0 -mt-[1px] w-full bg-white border border-border shadow-lg rounded-b-lg max-h-[60vh] overflow-y-auto overflow-x-hidden overscroll-contain transition-all duration-200"
    >
      <nav class="py-2 px-4 pb-4">
        <ul class="space-y-1">
          <li v-for="link in links" :key="link.id">
            <a
              :href="`#${link.id}`"
              @click.prevent="handleClick(link.id)"
              class="block py-1.5 text-sm break-words hover:text-accent border-l-2 hover:border-accent pl-3 -ml-[1px]"
              :class="activeId === link.id ? 'text-accent border-accent font-medium' : 'text-sub border-transparent'"
            >
              {{ link.text }}
            </a>
            <ul v-if="link.children && link.children.length > 0" class="ml-2 mt-1 space-y-1">
              <li v-for="child in link.children" :key="child.id">
                 <a
                  :href="`#${child.id}`"
                  @click.prevent="handleClick(child.id)"
                  class="block py-1.5 text-xs break-words hover:text-accent pl-3 border-l-2 hover:border-accent -ml-[1px]"
                  :class="activeId === child.id ? 'text-accent border-accent font-medium' : 'text-sub border-transparent'"
                >
                  {{ child.text }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </div>
    
    <!-- Backdrop to close when clicking outside -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[-1] bg-black/20"
      @click="isOpen = false"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  links: any[]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// ヘッダー(64px) + 目次バーの下端あたりを通過判定ラインにする
const { activeId } = useTocActive(computed(() => props.links), 140)

// 目次を開いた時、現在読んでいる見出しが見える位置までドロップダウン内をスクロールする
watch(isOpen, async (open) => {
  if (!open || !activeId.value) return
  await nextTick()

  const container = dropdownRef.value
  if (!container || container.scrollHeight <= container.clientHeight) return

  const link = container.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId.value)}"]`)
  if (!link) return

  const containerRect = container.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()
  container.scrollTop += linkRect.top - containerRect.top - containerRect.height / 2 + linkRect.height / 2
})
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

// 着地位置のオフセットは記事側の見出しの scroll-margin-top（[_slug].vue）で一元管理している。
// ジャンプ中は useScrollDirection が「下スクロール」を返すため目次バーは自動で隠れ、
// バーの高さ分を確保する必要がない
const handleClick = (id: string) => {
  isOpen.value = false
  scrollTo(id)
}
</script>
