<script setup lang="ts">
import ArticleCard from '~/components/article/ArticleCard.vue'

const { data: articles } = await useAsyncData('book-list', () =>
  queryCollection('book').where('published', '=', true).order('date', 'DESC').all(),
)
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="text-3xl font-bold text-main mb-2">Book Reviews</h1>
      <p class="text-sub">My thoughts on technical books.</p>
    </header>

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
  </div>
</template>
