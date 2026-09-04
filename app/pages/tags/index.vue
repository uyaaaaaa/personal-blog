<script setup lang="ts">
import { useArticleTags } from '~/composables/useArticleTags'
import { usePageSeo } from '~/composables/usePageSeo'

const { data: tags } = useArticleTags()

usePageSeo({
  title: 'Tags',
  description: '記事に付けられたタグの一覧。',
})
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="mb-2 text-3xl font-bold text-main">Tags</h1>
      <p class="text-sub">Browse articles by tag.</p>
    </header>

    <div class="flex flex-wrap gap-3">
      <NuxtLink
        v-for="tag in tags"
        :key="tag.slug"
        :to="`/tags/${tag.slug}`"
        class="tag-link flex items-center gap-2 rounded border border-border bg-surface px-3 py-1.5 font-mono text-sm text-main transition-colors"
      >
        <span>{{ tag.name }}</span>
        <span class="text-xs text-sub">{{ tag.count }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.tag-link:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
