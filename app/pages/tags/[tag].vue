<script setup lang="ts">
import ArticleCard from '~/components/article/ArticleCard.vue'

const route = useRoute()
const slug = computed(() => String(route.params.tag))

const { data: articles } = await useAsyncData(`tag-articles-${slug.value}`, () =>
  queryCollection('article').where('published', '=', true).order('date', 'DESC').all(),
)

// スラグに一致するタグを持つ記事だけに絞り込む
const filteredArticles = computed(() =>
  (articles.value ?? []).filter(article =>
    (article.tags ?? []).some(tag => tagToSlug(tag) === slug.value),
  ),
)

// 表示用のタグ名は記事のfrontmatterに書かれた元の表記を使う
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
</script>

<template>
  <div class="space-y-8">
    <header class="border-b border-border pb-8">
      <h1 class="text-3xl font-bold text-main mb-2">
        <span class="text-accent font-mono">#</span> {{ tagName }}
      </h1>
      <p class="text-sub">{{ filteredArticles.length }} article{{ filteredArticles.length === 1 ? '' : 's' }} tagged with "{{ tagName }}".</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ArticleCard
        v-for="article in filteredArticles"
        :key="article.path"
        :title="article.title"
        :path="article.path"
        :description="article.description"
        :date="article.date"
        :tags="article.tags"
      />
    </div>

    <NuxtLink to="/tags" class="inline-block text-accent font-semibold">
      &larr; All tags
    </NuxtLink>
  </div>
</template>
