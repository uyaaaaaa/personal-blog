<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    <ArticleCard
      v-for="article in articles"
      :key="article.path"
      :title="article.title"
      :path="article.path"
      :date="article.date"
      :emoji="article.emoji"
      :tags="article.tags"
    />
  </div>
</template>

<script setup lang="ts">
import ArticleCard from '~/components/article/ArticleCard.vue'

interface Article {
  path: string
  title: string
  date: string
  emoji?: string
  tags?: string[]
}

defineProps<{
  articles: Article[]
}>()
</script>
