<script setup lang="ts">
defineOptions({
  name: 'ProseTable'
})
</script>

<template>
  <div class="prose-table-scroll">
    <table>
      <slot />
    </table>
  </div>
</template>

<style scoped>
/* @tailwindcss/typography は pre と違い table にスクロール領域を与えないため、ここで持たせる */
.prose-table-scroll {
  overflow-x: auto;
}
</style>
