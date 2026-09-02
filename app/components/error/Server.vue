<template>
  <ErrorView
    :code="statusCode"
    message="An Error Occurred"
    description="We're sorry, but something went wrong. Please try again later."
  />
</template>

<script setup lang="ts">
import ErrorView from '~/components/error/ErrorView.vue'

defineProps<{
  statusCode: number
}>()
</script>
