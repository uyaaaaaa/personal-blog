<script setup lang="ts">
import ArticleList from '~/components/ArticleList.vue'
import Pagination from '~/components/common/Pagination.vue'
import BackButton from '~/components/common/BackButton.vue'

const route = useRoute()
const slug = computed(() => String(route.params.tag))

const { data: articles } = await useAsyncData(`tag-articles-${slug.value}`, () =>
  queryCollection('article')
    .where('published', '=', true)
    .order('date', 'DESC')
    .select('path', 'title', 'date', 'emoji', 'tags')
    .all(),
)

const filteredArticles = computed(() =>
  (articles.value ?? []).filter(article =>
    (article.tags ?? []).some(tag => tagToSlug(tag) === slug.value),
  ),
)

const tagName = computed(() => {
  for (const article of articles.value ?? []) {
    const matched = (article.tags ?? []).find(tag => tagToSlug(tag) === slug.value)
    if (matched) return matched
  }
  return slug.value
})

if (filteredArticles.value.length === 0) {
  throw createError({ statusCode: 404, statusMessage: 'Tag not found', fatal: true })
}

const { page, totalPages, pagedItems, basePath } = usePagination(filteredArticles)

usePageSeo({
  title: () => (page.value > 1 ? `#${tagName.value} (${page.value}/${totalPages.value})` : `#${tagName.value}`),
  description: () => `${tagName.value} タグが付いた記事の一覧。`,
})
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="text-3xl font-bold text-main mb-2">
        <span class="text-accent font-mono">#</span> {{ tagName }}
      </h1>
      <p class="text-sub">{{ filteredArticles.length }} article{{ filteredArticles.length === 1 ? '' : 's' }} tagged with "{{ tagName }}".</p>
    </header>

    <ArticleList :articles="pagedItems" />

    <Pagination :page="page" :total-pages="totalPages" :base-path="basePath" />

    <BackButton to="/tags" label="All tags" />
  </div>
</template>
