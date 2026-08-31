<script setup lang="ts">
import ArticleCard from '~/components/article/ArticleCard.vue'

const { data: articles } = await useAsyncData('article-list', () =>
  queryCollection('article').where('published', '=', true).order('date', 'DESC').all(),
)
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="text-3xl font-bold text-main mb-2">Articles</h1>
      <p class="text-sub">All tech articles and book reviews.</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-7">
      <ArticleCard
        v-for="article in articles"
        :key="article.path"
        :title="article.title"
        :path="article.path"
        :date="article.date"
        :emoji="article.emoji"
      />
    </div>
  </div>
</template>
