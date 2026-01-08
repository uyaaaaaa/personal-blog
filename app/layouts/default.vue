<template>
  <div class="layout-container">
    <Header />
    <main class="main-content container">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from '../components/layout/Header.vue'
import Footer from '../components/layout/Footer.vue'
</script>

<style>
:root {
  --color-bg: #F9F9F9;
  --color-text-main: #1A1A1A;
  --color-text-sub: #888888;
  --color-accent: #8B5CF6;
  --color-border: #E5E5E5;
  --color-code-bg: #F5F5F5;
  --font-base: system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body {
  margin: 0;
  font-family: var(--font-base);
  background-color: var(--color-bg);
  color: var(--color-text-main);
  line-height: 1.6;
}

*, *::before, *::after {
  box-sizing: border-box;
}

a {
  text-decoration: none;
  color: inherit;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--color-accent);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
</style>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding-top: 2rem;
  padding-bottom: 4rem;
  width: 100%;
}
</style>
