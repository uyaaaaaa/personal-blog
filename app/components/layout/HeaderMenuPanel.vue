<template>
  <div class="menu-panel-layer" :class="{ 'is-open': isOpen }">
    <div class="container menu-panel-anchor">
      <div class="menu-panel shadow-lg" v-bind="$attrs">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{
  isOpen: boolean
}>()
</script>

<style scoped>
.menu-panel-layer {
  position: absolute;
  top: calc(100% + 1px);
  left: 0;
  right: 0;
  pointer-events: none;
}

.menu-panel-anchor {
  display: flex;
  justify-content: flex-end;
}

.menu-panel {
  position: relative;
  width: 960px;
  max-width: 100%;
  padding: 1.5rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 10px 10px;
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: minmax(0, max-content);
  grid-auto-columns: minmax(0, 1fr);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.16s ease-out, transform 0.16s ease-out, visibility 0.16s;
}


.is-open .menu-panel {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}
</style>
