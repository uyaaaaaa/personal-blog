<template>
  <div class="menu-column">
    <NuxtLink v-if="to" :to="to" class="menu-column-head">
      {{ label }}
      <span class="menu-column-arrow" aria-hidden="true">&rarr;</span>
    </NuxtLink>
    <span v-else class="menu-column-head">{{ label }}</span>

    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  to?: string
}>()
</script>

<style scoped>
.menu-column {
  min-width: 0;
  padding: 0 1.5rem;
}

.menu-column:first-child {
  padding-left: 0;
}

.menu-column:last-child {
  padding-right: 0;
}

.menu-column + .menu-column {
  border-left: 1px solid var(--color-border);
}

.menu-column-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.875rem;
  padding: 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-sub);
}

.menu-column-head:hover {
  color: var(--color-accent);
}

.menu-column-arrow {
  transition: transform 0.2s;
}

.menu-column-head:hover .menu-column-arrow {
  transform: translateX(3px);
}
</style>
