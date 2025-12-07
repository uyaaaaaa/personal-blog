<template>
  <NuxtLink :to="path" class="article-card block h-full bg-white border border-border rounded-lg p-6 hover:shadow-sm transition-shadow duration-200">
    <!-- Header: Icon & Date -->
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center gap-2">
        <span class="text-accent font-mono text-xl font-bold">&lt;/&gt;</span>
      </div>
      <div class="text-sub text-sm font-mono">
        {{ formattedDate }}
      </div>
    </div>

    <!-- Title -->
    <h3 class="text-xl font-bold text-main mb-3 line-clamp-2">
      {{ title }}
    </h3>

    <!-- Description -->
    <p class="text-sub text-sm leading-relaxed mb-4 line-clamp-2">
      {{ description }}
    </p>

    <!-- Footer: Tags -->
    <div class="mt-auto flex flex-wrap gap-2">
      <span 
        v-for="tag in tags" 
        :key="tag"
        class="tag text-xs px-2 py-1 rounded border border-accent text-accent font-mono bg-white"
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
  description?: string
  date?: string
  tags?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  date: '',
  tags: () => []
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  return new Date(props.date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '.')
})
</script>

<style scoped>
.article-card:hover h3 {
  color: theme('colors.accent');
}

.article-card:hover {
  border-color: theme('colors.accent');
}

.tag:hover {
  background-color: theme('colors.gray.50');
}
</style>
