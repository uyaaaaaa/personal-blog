<template>
  <div class="toc-container flex flex-col min-h-0">
    <h4 class="font-bold text-main mb-4 flex-shrink-0">目次</h4>
    <nav ref="navRef" class="toc-nav min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-2">
      <ul class="space-y-2 relative">
        <div class="absolute left-[3px] top-2 bottom-2 w-[2px] bg-surface-muted -z-10"></div>

        <li v-for="link in links" :key="link.id" class="toc-item">
          <a
            :href="`#${link.id}`"
            @click.prevent="scrollTo(link.id)"
            class="block pl-4 py-1 text-sm break-words hover:text-accent focus:text-accent transition-colors duration-200 border-l-2 hover:border-accent focus:border-accent focus:outline-none"
            :class="activeId === link.id ? 'text-accent border-accent font-medium' : 'text-sub border-transparent'"
          >
            {{ link.text }}
          </a>
          <ul v-if="link.children && link.children.length > 0" class="ml-2 mt-2 space-y-2">
            <li v-for="child in link.children" :key="child.id">
               <a
                :href="`#${child.id}`"
                @click.prevent="scrollTo(child.id)"
                class="block pl-4 py-1 text-xs break-words hover:text-accent focus:text-accent transition-colors duration-200 focus:outline-none"
                :class="activeId === child.id ? 'text-accent font-medium' : 'text-sub'"
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

const props = defineProps<{
  links: any[]
}>()

const { scrollTo } = useScrollTo()

const navRef = ref<HTMLElement | null>(null)
const { isDesktop } = useIsDesktop()
const { activeId } = useTocActive(computed(() => props.links), 100, isDesktop)

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
    container.scrollTop += linkRect.top - containerRect.top - containerRect.height / 2 + linkRect.height / 2
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
