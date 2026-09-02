<template>
  <ErrorView
    code="404"
    message="Page Not Found"
    description="The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
  />
</template>

<script setup lang="ts">
import ErrorView from '~/components/error/ErrorView.vue'
</script>
