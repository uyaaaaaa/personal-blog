<script setup lang="ts">
import ArticleList from '~/components/ArticleList.vue'
import Pagination from '~/components/common/Pagination.vue'

const { data: articles } = await useAsyncData('article-list', () =>
  queryCollection('article')
    .where('published', '=', true)
    .order('date', 'DESC')
    .select('path', 'title', 'date', 'emoji', 'tags')
    .all(),
)

const { page, totalPages, pagedItems, basePath } = usePagination(computed(() => articles.value ?? []))

usePageSeo({
  title: () => (page.value > 1 ? `Articles (${page.value}/${totalPages.value})` : 'Articles'),
  description: '公開中の記事の一覧。',
})
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="text-3xl font-bold text-main mb-2">Articles</h1>
      <p class="text-sub">All tech articles and book reviews.</p>
    </header>

    <ArticleList :articles="pagedItems" />

    <Pagination :page="page" :total-pages="totalPages" :base-path="basePath" />
  </div>
</template>
