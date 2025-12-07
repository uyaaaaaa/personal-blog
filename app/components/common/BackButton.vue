<script setup lang="ts">
interface Props {
  to?: string | object
  label?: string
}

withDefaults(defineProps<Props>(), {
  to: '/blog',
  label: 'Back to Articles',
})
</script>

<template>
  <NuxtLink 
    :to="to" 
    class="inline-flex items-center gap-2 text-sm text-sub hover:text-accent transition-colors duration-200 group"
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="18" 
      height="18" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      class="group-hover:-translate-x-1 transition-transform duration-200"
    >
      <path d="M19 12H5"/>
      <path d="M12 19l-7-7 7-7"/>
    </svg>
    <span>{{ label }}</span>
  </NuxtLink>
</template>
