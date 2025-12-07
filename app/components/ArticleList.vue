<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <ArticleCard
      v-for="article in articles"
      :key="article.path"
      :title="article.title"
      :path="article.path"
      :description="article.description"
      :date="article.date"
      :tags="article.tags"
    />
  </div>
</template>

<script setup lang="ts">
import ArticleCard from '~/components/article/ArticleCard.vue'

interface Article {
  path: string
  title: string
  description: string
  date: string
  tags?: string[]
}

defineProps<{
  articles: Article[]
}>()
</script>
