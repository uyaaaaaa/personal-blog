<template>
  <div
    ref="containerRef"
    class="sticky top-[74px] z-40 lg:hidden"
    :class="{ 'pointer-events-none': !isVisible }"
  >
    <div
      class="rounded-lg border border-border bg-surface-muted transition-all duration-300"
      :class="{
        'shadow-sm': isSticky,
        '-translate-y-[120px] opacity-0': !isVisible,
      }"
    >
      <button
        @click="isOpen = !isOpen"
        class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-main transition-colors"
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
        ref="dropdownRef"
        class="absolute left-0 top-full -mt-[1px] max-h-[60vh] w-full overflow-y-auto overflow-x-hidden overscroll-contain rounded-b-lg border border-border bg-surface shadow-lg transition-all duration-200"
      >
        <nav class="px-4 py-2 pb-4">
          <ul class="space-y-1">
            <li v-for="link in links" :key="link.id">
              <a
                :href="`#${link.id}`"
                @click.prevent="handleClick(link.id)"
                class="-ml-[1px] block break-words border-l-2 py-1.5 pl-3 text-sm hover:border-accent hover:text-accent"
                :class="
                  activeId === link.id
                    ? 'border-accent font-medium text-accent'
                    : 'border-transparent text-sub'
                "
              >
                {{ link.text }}
              </a>
              <ul v-if="link.children && link.children.length > 0" class="ml-2 mt-1 space-y-1">
                <li v-for="child in link.children" :key="child.id">
                  <a
                    :href="`#${child.id}`"
                    @click.prevent="handleClick(child.id)"
                    class="-ml-[1px] block break-words border-l-2 py-1.5 pl-3 text-xs hover:border-accent hover:text-accent"
                    :class="
                      activeId === child.id
                        ? 'border-accent font-medium text-accent'
                        : 'border-transparent text-sub'
                    "
                  >
                    {{ child.text }}
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>

      <div v-if="isOpen" class="fixed inset-0 z-[-1] bg-black/20" @click="isOpen = false"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useScrollTo } from '~/composables/useScrollTo'
import { isProgrammaticScroll } from '~/composables/useProgrammaticScroll'
import { useScrollDirection } from '~/composables/useScrollDirection'
import { useTocActive } from '~/composables/useTocActive'
import { useIsDesktop } from '~/composables/useIsDesktop'
import { useScrollFrame } from '~/composables/useScrollFrame'

const props = defineProps<{
  links: any[]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const { isMobile } = useIsDesktop()
const { activeId } = useTocActive(
  computed(() => props.links),
  140,
  isMobile,
)

watch(isOpen, async (open) => {
  if (!open || !activeId.value) return
  await nextTick()

  const container = dropdownRef.value
  if (!container || container.scrollHeight <= container.clientHeight) return

  const link = container.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId.value)}"]`)
  if (!link) return

  const containerRect = container.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()
  container.scrollTop +=
    linkRect.top - containerRect.top - containerRect.height / 2 + linkRect.height / 2
})
const isSticky = ref(false)

const { direction } = useScrollDirection(8, isMobile)
const isVisible = computed(
  () =>
    !isSticky.value || isOpen.value || (direction.value === 'up' && !isProgrammaticScroll.value),
)
const containerRef = ref<HTMLElement | null>(null)

const STICKY_TOP = 74

const updateSticky = () => {
  const el = containerRef.value
  if (!el) return

  isSticky.value = el.getBoundingClientRect().top <= STICKY_TOP + 1
}

useScrollFrame(updateSticky, isMobile)

const { scrollTo } = useScrollTo()

const handleClick = (id: string) => {
  isOpen.value = false
  scrollTo(id)
}
</script>
