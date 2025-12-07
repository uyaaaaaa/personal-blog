<template>
  <div>
    <!-- Desktop Navigation -->
    <div class="header-right desktop-only">
      <nav class="nav">
        <NuxtLink 
          v-for="item in menuItems" 
          :key="item.path" 
          :to="item.path" 
          class="nav-item"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>

    <!-- Mobile Navigation -->
    <div class="mobile-only">
      <button 
        class="mobile-menu-btn" 
        @click="emit('toggle')"
        aria-label="Toggle menu"
        :class="{ 'is-active': isOpen }"
      >
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>

      <div 
        class="mobile-menu-overlay" 
        :class="{ 'is-open': isOpen }"
        @click="emit('close')"
      >
        <div class="mobile-menu-content" @click.stop>
          <nav class="mobile-nav">
            <NuxtLink 
              v-for="item in menuItems" 
              :key="item.path" 
              :to="item.path" 
              class="mobile-nav-item" 
              @click="emit('close')"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'close'): void
}>()

const menuItems = [
  { label: 'Blog', path: '/blog' },
  // { label: 'Tags', path: '/tags' },
  // { label: 'About', path: '/about' },
]
</script>

<style scoped>
/* Desktop Styles */
.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav {
  display: flex;
  gap: 1.5rem;
}

.nav-item {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.2s;
}

.nav-item:hover {
  color: var(--color-primary);
}

/* Mobile Styles */
.mobile-menu-btn {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20px;
  height: 15px;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 102;
  padding: 0;
}

.hamburger-line {
  display: block;
  width: 100%;
  height: 2px;
  background-color: #000;
  border-radius: 2px;
  transition: all 0.3s ease-in-out;
}

.mobile-menu-btn.is-active .hamburger-line:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.mobile-menu-btn.is-active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.mobile-menu-btn.is-active .hamburger-line:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

.mobile-menu-overlay {
  position: fixed;
  top: 64px;
  left: 0;
  width: 100%;
  height: calc(100vh - 64px);
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 90;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
}

.mobile-menu-overlay.is-open {
  opacity: 1;
  visibility: visible;
}

.mobile-menu-content {
  background-color: #fff;
  width: 100%;
  padding: 1rem 0;
  transform: translateY(-100%);
  transition: transform 0.3s ease-in-out;
  border-bottom: 1px solid var(--color-border);
}

.mobile-menu-overlay.is-open .mobile-menu-content {
  transform: translateY(0);
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.mobile-nav-item {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}

/* Responsive Switching */
@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
}

@media (min-width: 769px) {
  .mobile-only {
    display: none;
  }
}
</style>
