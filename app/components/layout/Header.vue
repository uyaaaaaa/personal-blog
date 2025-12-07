<template>
  <header class="global-header">
    <div class="container header-inner">
      <NuxtLink to="/" class="logo" @click="closeMenu">&lt;/&gt; Tech Blog</NuxtLink>

      <!-- Search Trigger (Desktop) -->
      <div class="hidden md:flex flex-1 max-w-md mx-8">
        <button class="w-full flex items-center justify-between px-4 py-2 bg-base border border-border rounded-md text-sub hover:border-accent transition-colors group">
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 group-hover:text-accent"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span class="text-sm">Search...</span>
          </span>
          <span class="text-xs bg-white border border-border px-1.5 py-0.5 rounded text-sub">Cmd+K</span>
        </button>
      </div>

      <Navigation 
        :is-open="isMenuOpen" 
        @toggle="toggleMenu" 
        @close="closeMenu" 
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Navigation from '@/components/layout/HeaderNavigation.vue'

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value

  if (isMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

const closeMenu = () => {
  isMenuOpen.value = false
  document.body.style.overflow = ''
}
</script>

<style scoped>
.global-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  height: 64px;
  display: flex;
  align-items: center;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.logo {
  font-weight: 700;
  font-size: 1.25rem;
  font-family: var(--font-mono);
  letter-spacing: -0.5px;
  position: relative;
  z-index: 102; /* Ensure logo is above mobile menu */
}

</style>
