<template>
  <NuxtLayout name="default">
    <div>
      <NotFound v-if="error.statusCode === 404" />
      <ServerError v-else :statusCode="error.statusCode" />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import NotFound from './components/error/NotFound.vue';
import ServerError from './components/error/Server.vue';

defineProps<{
  error: NuxtError
}>()
</script>
