<template>
  <section v-if="article" class="relative group cursor-pointer" @click="navigateTo(article.path)">
    <div class="grid grid-cols-1 lg:grid-cols-2 items-center bg-white border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-300">
      <!-- Image Section -->
      <div class="relative aspect-video lg:h-full w-full overflow-hidden bg-gray-100">
        <img 
          v-if="article.image" 
          :src="article.image" 
          :alt="article.title"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
          <span class="text-6xl font-mono opacity-20">&lt;/&gt;</span>
        </div>
      </div>
      
      <!-- Content Section -->
      <div class="p-6 lg:p-10 flex flex-col justify-center h-full">
        <div class="flex items-center gap-3 mb-4">
          <span v-if="article.tags?.[0]" class="px-3 py-1 text-sm font-medium text-white bg-accent rounded-full">
            {{ article.tags[0] }}
          </span>
          <time class="text-sub font-mono">{{ formattedDate }}</time>
        </div>

        <h2 class="text-3xl lg:text-4xl font-bold text-main leading-tight group-hover:text-accent transition-colors">
          {{ article.title }}
        </h2>

        <p class="text-sub leading-relaxed mb-6 line-clamp-3">
          {{ article.description }}
        </p>

        <div class="flex items-center text-accent font-bold group-hover:translate-x-2 transition-transform duration-200">
          Read Article 
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Article {
  path: string
  title: string
  description: string
  date: string
  tags?: string[]
  image?: string
}

const props = defineProps<{
  article: Article
}>()

const formattedDate = computed(() => {
  if (!props.article.date) return ''
  return new Date(props.article.date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '.')
})
</script>
