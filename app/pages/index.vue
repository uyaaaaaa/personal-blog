<template>
  <div class="space-y-16">
    <!-- Hero Section -->
    <Hero 
      v-if="heroArticle" 
      :article="heroArticle" 
    />

    <!-- Articles -->
    <section>
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold font-mono text-main">Articles</h2>
        <NuxtLink to="/blog" class="flex items-center mr-2 text-accent font-bold hover:translate-x-2 transition-transform duration-200 text-sm">
          View All
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </NuxtLink>
      </div>
      
      <ArticleList :articles="listArticles" />
    </section>
  </div>
</template>

<script setup lang="ts">
// Fetch articles from 'blog' content directory
const { data: articles } = await useAsyncData('home-articles', () => 
  queryCollection('blog')
    .where('published', '=', true)
    .order('date', 'DESC')
    .limit(6) // Fetch top 10 articles
    .all()
)

// Split into Hero (1st) and List (Rest)
const heroArticle = computed(() => {
  return articles.value && articles.value.length > 0 ? articles.value[0] : null
})

const listArticles = computed(() => {
  return articles.value && articles.value.length > 1 ? articles.value.slice(1) : []
})

// Set SEO Meta
useSeoMeta({
  title: 'Tech Blog',
  description: 'Functional Minimalism for Experts. Technical articles on software engineering, architecture, and design.',
})
</script>
