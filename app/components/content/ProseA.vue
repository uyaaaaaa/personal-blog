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
  },
  rel: {
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

// Nuxt Content が外部リンクに付ける rel（既定は nofollow）を捨てず、要件の2つを足す
const relAttr = computed(() => {
  const tokens = new Set(props.rel?.split(/\s+/).filter(Boolean))

  if (isExternal.value) {
    tokens.add('noopener')
    tokens.add('noreferrer')
  }

  return tokens.size ? [...tokens].join(' ') : undefined
})

defineOptions({
  name: 'ProseA'
})
</script>

<template>
  <a
    v-if="isSameDocumentHash"
    :href="href"
    :target="targetAttr"
    :rel="relAttr"
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
