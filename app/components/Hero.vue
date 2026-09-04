<template>
  <section v-if="article" class="group relative cursor-pointer" @click="navigateTo(article.path)">
    <div
      class="grid grid-cols-1 items-center overflow-hidden rounded-[10px] border border-border bg-surface transition-all duration-300 hover:shadow-md lg:grid-cols-2"
    >
      <div class="relative h-40 w-full overflow-hidden bg-surface-muted lg:h-full lg:min-h-[230px]">
        <img
          v-if="article.image"
          :src="article.image"
          :alt="article.title"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div v-else class="flex h-full w-full items-center justify-center">
          <span
            class="text-7xl leading-none transition-transform duration-300 group-hover:scale-110 lg:text-8xl"
            >{{ article.emoji ?? '📝' }}</span
          >
        </div>
      </div>

      <div class="flex h-full flex-col justify-center gap-3 p-5 lg:p-10">
        <div class="flex items-center gap-3">
          <span class="font-mono text-xs font-bold tracking-widest text-accent">PICKUP</span>
          <span
            v-if="categoryLabel"
            class="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent"
          >
            {{ categoryLabel }}
          </span>
          <time class="font-mono text-sm text-sub" :datetime="article.date">{{
            formattedDate
          }}</time>
        </div>

        <h2
          class="text-xl font-bold leading-snug text-main transition-colors group-hover:text-accent lg:text-3xl"
        >
          {{ article.title }}
        </h2>

        <p
          v-if="article.description"
          class="line-clamp-2 text-sm leading-relaxed text-sub lg:line-clamp-3"
        >
          {{ article.description }}
        </p>

        <div class="mt-1">
          <span
            class="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-sub transition-colors duration-200 group-hover:text-main"
          >
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
