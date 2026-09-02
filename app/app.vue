<template>
  <NuxtLoadingIndicator color="var(--color-accent)" :height="2" :throttle="200" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { colors, darkColors } from '~~/theme/tokens'

const colorMode = useColorMode()

useHead({
  meta: [
    {
      name: 'theme-color',
      content: computed(() => (colorMode.value === 'dark' ? darkColors.bg : colors.surface)),
    },
  ],
})
</script>
