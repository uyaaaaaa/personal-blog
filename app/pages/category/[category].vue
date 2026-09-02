<script setup lang="ts">
import ArticleList from '~/components/ArticleList.vue'

const route = useRoute()
const category = String(route.params.category)

if (!isCategory(category)) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}

const label = CATEGORY_LABELS[category]

const { data: articles } = await useAsyncData(`category-articles-${category}`, () =>
  queryCollection('article')
    .where('published', '=', true)
    .where('category', '=', category)
    .order('date', 'DESC')
    .all(),
)

if ((articles.value ?? []).length === 0) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}

usePageSeo({
  title: label,
  description: `${label} カテゴリの記事一覧。`,
})
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="text-3xl font-bold text-main mb-2">{{ label }}</h1>
      <p class="text-sub">{{ articles?.length }} article{{ articles?.length === 1 ? '' : 's' }} in {{ label }}.</p>
    </header>

    <ArticleList :articles="articles ?? []" />

    <NuxtLink to="/" class="inline-block text-accent font-semibold">
      &larr; Back to top
    </NuxtLink>
  </div>
</template>
