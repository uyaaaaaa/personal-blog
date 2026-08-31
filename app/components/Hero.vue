<template>
  <section v-if="article" class="relative group cursor-pointer" @click="navigateTo(article.path)">
    <div class="grid grid-cols-1 lg:grid-cols-2 items-center bg-white border border-border rounded-[10px] overflow-hidden hover:shadow-md transition-all duration-300">
      <div class="relative h-40 lg:h-full lg:min-h-[230px] w-full overflow-hidden bg-gray-100">
        <img
          v-if="article.image"
          :src="article.image"
          :alt="article.title"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <span class="text-7xl lg:text-8xl leading-none transition-transform duration-300 group-hover:scale-110">{{ article.emoji ?? '📝' }}</span>
        </div>
      </div>

      <div class="p-5 lg:p-10 flex flex-col gap-3 justify-center h-full">
        <div class="flex items-center gap-3">
          <span class="text-accent text-xs font-bold font-mono tracking-widest">PICKUP</span>
          <span v-if="article.tags?.[0]" class="text-xs px-2 py-0.5 rounded border border-accent text-accent font-mono bg-white">
            {{ article.tags[0] }}
          </span>
          <time class="text-sub text-sm font-mono" :datetime="article.date">{{ formattedDate }}</time>
        </div>

        <h2 class="text-xl lg:text-3xl font-bold text-main leading-snug group-hover:text-accent transition-colors">
          {{ article.title }}
        </h2>

        <p v-if="article.description" class="text-sub text-sm leading-relaxed line-clamp-2 lg:line-clamp-3">
          {{ article.description }}
        </p>

        <div class="flex items-center text-accent font-bold text-sm group-hover:translate-x-2 transition-transform duration-200">
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
  emoji?: string
}

const props = defineProps<{
  article: Article
}>()

const formattedDate = computed(() => {
  return formatDate(props.article.date)
})
</script>
