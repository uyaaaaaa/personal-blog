<template>
  <header class="global-header">
    <div class="header-inner container">
      <NuxtLink to="/" class="logo" @click="closeMenu">
        <svg
          class="logo-mark"
          viewBox="0 0 32 32"
          width="26"
          height="26"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="32" height="32" rx="7" fill="#1A1A1A" />
          <path
            d="M8.5 10.5 v6.2 a4.6 4.6 0 0 0 9.2 0 v-6.2"
            fill="none"
            stroke="#FFFFFF"
            stroke-width="3.2"
            stroke-linecap="round"
          />
          <path
            d="M17.7 10.5 v11"
            fill="none"
            stroke="#FFFFFF"
            stroke-width="3.2"
            stroke-linecap="round"
          />
          <line
            x1="26"
            y1="9.5"
            x2="22.4"
            y2="22.5"
            stroke="#8B5CF6"
            stroke-width="3"
            stroke-linecap="round"
          />
        </svg>
        <span>Tech Blog</span>
      </NuxtLink>

      <div class="mx-8 hidden max-w-md flex-1 md:flex">
        <button
          class="group flex w-full items-center justify-between rounded-md border border-border bg-surface-subtle px-4 py-2 text-sub transition-colors hover:border-accent"
        >
          <span class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4 group-hover:text-accent"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="text-sm">Search...</span>
          </span>
          <span class="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-sub"
            >Cmd+K</span
          >
        </button>
      </div>

      <div class="flex items-stretch gap-3 self-stretch md:gap-5">
        <ThemeToggle class="self-center" />
        <Navigation :is-open="isMenuOpen" @toggle="toggleMenu" @close="closeMenu" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Navigation from '~/components/layout/HeaderNavigation.vue'
import ThemeToggle from '~/components/layout/ThemeToggle.vue'

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
  background-color: var(--color-header-bg);
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
  height: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.25rem;
  font-family: var(--font-mono);
  letter-spacing: -0.5px;
}

.logo-mark {
  flex: none;
  display: block;
}
</style>
