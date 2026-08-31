<script setup lang="ts">
const props = defineProps({
  href: {
    type: String,
    default: ''
  },
  target: {
    type: String,
    default: undefined,
    required: false
  }
})

const isExternal = computed(() => {
  if (!props.href) return false
  
  return /^(http:\/\/|https:\/\/|\/\/)/.test(props.href)
})

const isSameDocumentHash = computed(() => props.href.startsWith('#'))

const targetAttr = computed(() => {
  if (props.target) {
    return props.target
  }
  return isExternal.value ? '_blank' : undefined
})

const relAttr = computed(() => {
  return isExternal.value ? 'noopener noreferrer' : undefined
})

defineOptions({
  name: 'ProseA'
})
</script>

<template>
  <a
    v-if="isSameDocumentHash"
    :href="href"
  >
    <slot />
  </a>
  <NuxtLink
    v-else
    :href="href"
    :target="targetAttr"
    :rel="relAttr"
  >
    <slot />
  </NuxtLink>
</template>
