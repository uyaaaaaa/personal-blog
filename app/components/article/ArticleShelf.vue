<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold font-mono text-main">
        <NuxtLink :to="viewAllPath" class="hover:text-accent transition-colors duration-200">{{ title }}</NuxtLink>
      </h2>
      <NuxtLink v-if="hasMore" :to="viewAllPath" class="flex items-center mr-2 text-accent font-bold hover:translate-x-2 transition-transform duration-200 text-sm">
        View All
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </NuxtLink>
    </div>

    <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-pl-4 -mx-4 px-4 pb-2 lg:grid lg:grid-cols-4 lg:gap-6 lg:mx-0 lg:px-0 lg:pb-0 lg:overflow-x-visible lg:snap-none">
      <ArticleCard
        v-for="(article, index) in articles"
        :key="article.path"
        :title="article.title"
        :path="article.path"
        :date="article.date"
        :emoji="article.emoji"
        :tags="article.tags"
        class="w-[264px] shrink-0 snap-start lg:w-auto"
        :class="index >= PC_VISIBLE_COUNT ? 'lg:hidden' : ''"
      />
    </div>
  </section>
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

const props = defineProps<{
  title: string
  articles: Article[]
  total: number
  viewAllPath: string
}>()

const PC_VISIBLE_COUNT = 4

const hasMore = computed(() => props.total > props.articles.length)
</script>
