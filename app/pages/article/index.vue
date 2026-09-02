<script setup lang="ts">
import ArticleList from '~/components/ArticleList.vue'
import Pagination from '~/components/common/Pagination.vue'

const { data: articles } = await useAsyncData('article-list', () =>
  queryCollection('article').where('published', '=', true).order('date', 'DESC').all(),
)

const { page, totalPages, pagedItems } = usePagination(computed(() => articles.value ?? []))

usePageSeo({
  title: 'Articles',
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

    <Pagination :page="page" :total-pages="totalPages" />
  </div>
</template>
