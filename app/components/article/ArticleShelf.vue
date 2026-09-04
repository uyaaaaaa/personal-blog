<template>
  <section>
    <div class="mb-6 flex items-center justify-between">
      <h2 class="font-mono text-2xl font-bold text-main">
        <NuxtLink :to="viewAllPath" class="transition-colors duration-200 hover:text-accent">{{
          title
        }}</NuxtLink>
      </h2>
      <NuxtLink
        v-if="hasMoreOnDesktop"
        :to="viewAllPath"
        class="mr-2 items-center text-sm font-bold text-accent transition-transform duration-200 hover:translate-x-2"
        :class="hasMoreOnMobile ? 'flex' : 'hidden lg:flex'"
      >
        View All
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="ml-2 h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </NuxtLink>
    </div>

    <div
      class="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-6 lg:overflow-x-visible lg:px-0 lg:pb-0"
    >
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

const desktopVisibleCount = computed(() => Math.min(props.articles.length, PC_VISIBLE_COUNT))

const hasMoreOnDesktop = computed(() => props.total > desktopVisibleCount.value)
const hasMoreOnMobile = computed(() => props.total > props.articles.length)
</script>
