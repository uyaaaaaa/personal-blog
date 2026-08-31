<script setup lang="ts">
const { data: tags } = useArticleTags()
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="text-3xl font-bold text-main mb-2">Tags</h1>
      <p class="text-sub">Browse articles by tag.</p>
    </header>

    <div class="flex flex-wrap gap-3">
      <NuxtLink
        v-for="tag in tags"
        :key="tag.slug"
        :to="`/tags/${tag.slug}`"
        class="tag-link flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-white font-mono text-sm text-main transition-colors"
      >
        <span>{{ tag.name }}</span>
        <span class="text-xs text-sub">{{ tag.count }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.tag-link:hover {
  border-color: theme('colors.accent');
  color: theme('colors.accent');
}
</style>
