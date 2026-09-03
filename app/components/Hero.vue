<template>
  <section v-if="article" class="relative group cursor-pointer" @click="navigateTo(article.path)">
    <div class="grid grid-cols-1 lg:grid-cols-2 items-center bg-surface border border-border rounded-[10px] overflow-hidden hover:shadow-md transition-all duration-300">
      <div class="relative h-40 lg:h-full lg:min-h-[230px] w-full overflow-hidden bg-surface-muted">
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
          <span v-if="categoryLabel" class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono">
            {{ categoryLabel }}
          </span>
          <time class="text-sub text-sm font-mono" :datetime="article.date">{{ formattedDate }}</time>
        </div>

        <h2 class="text-xl lg:text-3xl font-bold text-main leading-snug group-hover:text-accent transition-colors">
          {{ article.title }}
        </h2>

        <p v-if="article.description" class="text-sub text-sm leading-relaxed line-clamp-2 lg:line-clamp-3">
          {{ article.description }}
        </p>

        <div class="mt-1">
          <span class="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-sub transition-colors duration-200 group-hover:text-main">
            more
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-2 w-5 transition-transform duration-200 group-hover:translate-x-1"
              viewBox="0 0 20 8"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M0 4h19" />
              <path d="M15.5 1L19 4l-3.5 3" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/date'
import { CATEGORY_LABELS, isCategory } from '~/utils/category'

interface Article {
  path: string
  title: string
  description: string
  date: string
  category?: string
  image?: string
  emoji?: string
}

const props = defineProps<{
  article: Article
}>()

const formattedDate = computed(() => {
  return formatDate(props.article.date)
})

const categoryLabel = computed(() => {
  const category = props.article.category
  return category && isCategory(category) ? CATEGORY_LABELS[category] : null
})
</script>
