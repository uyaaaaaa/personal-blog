<template>
  <NuxtLink :to="path" class="article-card flex items-start gap-3.5 group">
    <!-- Emoji thumbnail -->
    <div class="flex-shrink-0 w-16 h-16 rounded-[10px] bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200">
      <span class="text-4xl leading-none">{{ emoji }}</span>
    </div>

    <!-- Title & Meta -->
    <div class="min-w-0 flex-1">
      <h3 class="text-[15px] font-bold leading-5 text-main line-clamp-3 group-hover:text-accent transition-colors duration-200">
        {{ title }}
      </h3>

      <div class="mt-2.5 flex items-center gap-2">
        <img
          :src="author.avatar"
          :alt="author.name"
          class="w-[22px] h-[22px] rounded-full flex-shrink-0"
          loading="lazy"
          width="22"
          height="22"
        >
        <span class="text-[13px] font-medium text-main truncate">{{ author.name }}</span>
        <time class="text-[13px] text-sub flex-shrink-0" :datetime="date">{{ formattedDate }}</time>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Props {
  title: string
  path: string
  date?: string
  emoji?: string
}

const props = withDefaults(defineProps<Props>(), {
  date: '',
  emoji: '📝'
})

const { author } = useAppConfig()

const formattedDate = computed(() => {
  return formatRelativeDate(props.date)
})
</script>
