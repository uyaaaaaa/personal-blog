<template>
  <NuxtLink :to="path" class="article-card flex flex-col gap-3 bg-white border border-border rounded-[10px] p-4 md:p-5 hover:shadow-sm transition-shadow duration-200">
    <!-- Header: Emoji tile & Date -->
    <div class="flex justify-between items-center">
      <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
        <span class="text-[28px] leading-none">{{ emoji }}</span>
      </div>
      <time class="text-sub text-sm font-mono" :datetime="date">{{ formattedDate }}</time>
    </div>

    <!-- Title -->
    <h3 class="text-base font-bold leading-snug text-main line-clamp-2 min-h-[2.6em]">
      {{ title }}
    </h3>

    <!-- Footer: Tags -->
    <div class="mt-auto flex flex-wrap gap-1.5">
      <span
        v-for="tag in tags"
        :key="tag"
        class="tag text-xs px-2 py-0.5 rounded border border-accent text-accent font-mono bg-white"
      >
        {{ tag }}
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Props {
  title: string
  path: string
  date?: string
  emoji?: string
  tags?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  date: '',
  emoji: '📝',
  tags: () => []
})

const formattedDate = computed(() => {
  return formatDate(props.date)
})
</script>

<style scoped>
.article-card:hover h3 {
  color: theme('colors.accent');
}

.article-card:hover {
  border-color: theme('colors.accent');
}
</style>
