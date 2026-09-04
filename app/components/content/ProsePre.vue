<script setup lang="ts">
defineOptions({
  name: 'ProsePre',
  inheritAttrs: false,
})

defineProps<{
  code?: string
  language?: string | null
  filename?: string | null
  highlights?: number[]
  meta?: string | null
  class?: string | null
}>()
</script>

<template>
  <figure class="code-block">
    <figcaption v-if="filename" class="code-block-label">{{ filename }}</figcaption>
    <pre :class="$props.class" v-bind="$attrs"><slot /></pre>
  </figure>
</template>

<style scoped>
.code-block {
  --code-block-padding-x: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background-color: var(--color-surface-subtle);
  overflow: hidden;
}

.code-block-label {
  margin: 0;
  padding: 0.375rem var(--code-block-padding-x);
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--color-sub);
  overflow-wrap: anywhere;
}

pre {
  margin: 0;
  padding: 0.75rem var(--code-block-padding-x);
  background-color: transparent;
  color: var(--color-code-text);
}

pre :deep(code) {
  display: block;
  width: max-content;
  min-width: 100%;
}

pre :deep(.line) {
  display: block;
  margin-inline: calc(var(--code-block-padding-x) * -1);
  padding-inline: var(--code-block-padding-x);
}

pre :deep(.line.diff-add) {
  background-color: var(--color-diff-add-bg);
}

pre :deep(.line.diff-remove) {
  background-color: var(--color-diff-remove-bg);
}

/* github-light / github-dark はdiffのトークン自体にも背景色を持ち、行背景の上に文字幅の塗りが重なる。
   Nuxt Contentが出す `html pre.shiki code .sXXXX`（特異度 0,2,3）に勝つセレクタで打ち消す */
pre.shiki :deep(code .line > span) {
  --shiki-default-bg: transparent;
  --shiki-dark-bg: transparent;
}

/* マーカーと変化した語の文字色はテーマの赤・緑ではなく本文色。
   `html.dark .shiki span`（特異度 0,2,2）に勝つセレクタで当てる */
pre.shiki :deep(code .diff-marker),
pre.shiki :deep(code .diff-word) {
  color: var(--color-code-text);
}

pre.shiki :deep(code .diff-word) {
  border-radius: 0.125rem;
}

pre.shiki :deep(code .diff-add .diff-word) {
  background-color: var(--color-diff-add-word-bg);
}

pre.shiki :deep(code .diff-remove .diff-word) {
  background-color: var(--color-diff-remove-word-bg);
}
</style>
