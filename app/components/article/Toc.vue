<template>
  <div class="toc-container flex min-h-0 flex-col">
    <h4 class="mb-4 flex-shrink-0 font-bold text-main">目次</h4>
    <nav
      ref="navRef"
      class="toc-nav min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-2"
    >
      <ul class="relative space-y-2">
        <div class="absolute bottom-2 left-[3px] top-2 -z-10 w-[2px] bg-surface-muted"></div>

        <li v-for="link in links" :key="link.id" class="toc-item">
          <a
            :href="`#${link.id}`"
            @click.prevent="scrollTo(link.id)"
            class="block break-words border-l-2 py-1 pl-4 text-sm transition-colors duration-200 hover:border-accent hover:text-accent focus:border-accent focus:text-accent focus:outline-none"
            :class="
              activeId === link.id
                ? 'border-accent font-medium text-accent'
                : 'border-transparent text-sub'
            "
          >
            {{ link.text }}
          </a>
          <ul v-if="link.children && link.children.length > 0" class="ml-2 mt-2 space-y-2">
            <li v-for="child in link.children" :key="child.id">
              <a
                :href="`#${child.id}`"
                @click.prevent="scrollTo(child.id)"
                class="block break-words py-1 pl-4 text-xs transition-colors duration-200 hover:text-accent focus:text-accent focus:outline-none"
                :class="activeId === child.id ? 'font-medium text-accent' : 'text-sub'"
              >
                {{ child.text }}
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useScrollTo } from '~/composables/useScrollTo'
import { useTocActive } from '~/composables/useTocActive'
import { useIsDesktop } from '~/composables/useIsDesktop'

const props = defineProps<{
  links: any[]
}>()

const { scrollTo } = useScrollTo()

const navRef = ref<HTMLElement | null>(null)
const { isDesktop } = useIsDesktop()
const { activeId } = useTocActive(
  computed(() => props.links),
  100,
  isDesktop,
)

watch(activeId, async (id) => {
  if (!id) return
  await nextTick()

  const container = navRef.value
  if (!container || container.scrollHeight <= container.clientHeight) return

  const link = container.querySelector<HTMLElement>(`a[href="#${CSS.escape(id)}"]`)
  if (!link) return

  const containerRect = container.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()

  if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
    container.scrollTop +=
      linkRect.top - containerRect.top - containerRect.height / 2 + linkRect.height / 2
  }
})
</script>

<style scoped>
.toc-nav {
  scrollbar-width: thin;
  scrollbar-color: var(--color-scrollbar) transparent;
}

.toc-nav::-webkit-scrollbar {
  width: 4px;
}

.toc-nav::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar);
  border-radius: 9999px;
}

.toc-nav::-webkit-scrollbar-track {
  background: transparent;
}
</style>
