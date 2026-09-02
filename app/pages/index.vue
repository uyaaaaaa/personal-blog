<template>
  <div class="space-y-16">
    <Hero
      v-if="heroArticle"
      :article="heroArticle"
    />

    <ArticleShelf
      v-for="shelf in shelves"
      :key="shelf.category"
      :title="shelf.title"
      :articles="shelf.articles"
      :total="shelf.total"
      :view-all-path="`/category/${shelf.category}`"
    />
  </div>
</template>

<script setup lang="ts">
import ArticleShelf from '~/components/article/ArticleShelf.vue'

const SHELF_LIMIT = 6

const { data: articles } = await useAsyncData('home-articles', () =>
  queryCollection('article')
    .where('published', '=', true)
    .order('date', 'DESC')
    .select('path', 'title', 'description', 'date', 'emoji', 'image', 'tags', 'category')
    .all(),
)

const heroArticle = computed(() => articles.value?.[0] ?? null)

const shelves = computed(() =>
  CATEGORIES
    .map((category) => {
      const inCategory = (articles.value ?? []).filter(article => article.category === category)
      return {
        category,
        title: CATEGORY_LABELS[category],
        total: inCategory.length,
        articles: inCategory
          .filter(article => article.path !== heroArticle.value?.path)
          .slice(0, SHELF_LIMIT),
      }
    })
    .filter(shelf => shelf.articles.length > 0),
)

usePageSeo()
</script>
