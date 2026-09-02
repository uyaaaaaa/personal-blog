<script setup lang="ts">
const props = defineProps<{
  page: number
  totalPages: number
  basePath: string
}>()

const WINDOW_RADIUS = 1

const items = computed<(number | 'gap')[]>(() => {
  const pages = new Set<number>([1, props.totalPages])
  for (let i = props.page - WINDOW_RADIUS; i <= props.page + WINDOW_RADIUS; i++) {
    if (i >= 1 && i <= props.totalPages) pages.add(i)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  return sorted.flatMap((value, index) => {
    const previous = sorted[index - 1]
    return previous !== undefined && value - previous > 1 ? ['gap' as const, value] : [value]
  })
})

const linkFor = (target: number) => (target === 1 ? props.basePath : `${props.basePath}/page/${target}`)
</script>

<template>
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-2" aria-label="Pagination">
    <NuxtLink
      v-if="page > 1"
      :to="linkFor(page - 1)"
      class="page-item"
      aria-label="Previous page"
    >
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </NuxtLink>
    <span v-else class="page-item page-item-disabled" aria-hidden="true">
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </span>

    <template v-for="(item, index) in items" :key="`${item}-${index}`">
      <span v-if="item === 'gap'" class="px-1 text-sub font-mono text-sm">…</span>
      <NuxtLink
        v-else-if="item !== page"
        :to="linkFor(item)"
        class="page-item"
      >
        {{ item }}
      </NuxtLink>
      <span v-else class="page-item page-item-current" aria-current="page">{{ item }}</span>
    </template>

    <NuxtLink
      v-if="page < totalPages"
      :to="linkFor(page + 1)"
      class="page-item"
      aria-label="Next page"
    >
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </NuxtLink>
    <span v-else class="page-item page-item-disabled" aria-hidden="true">
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </span>
  </nav>
</template>

<style scoped>
.page-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  background-color: var(--color-surface);
  color: var(--color-main);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  transition: border-color 0.2s ease, color 0.2s ease;
}

a.page-item:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.page-item-current {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.page-item-disabled {
  color: var(--color-sub);
}

.chevron {
  width: 18px;
  height: 18px;
}
</style>
