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
        <aside class="mobile-drawer" @click.stop>
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

          <div class="drawer-section">
            <h2 class="drawer-section-title">Tags</h2>
            <ul class="drawer-tag-list">
              <li v-for="tag in topTags" :key="tag.slug">
                <NuxtLink
                  :to="`/tags/${tag.slug}`"
                  class="drawer-tag-item"
                  @click="emit('close')"
                >
                  <span class="drawer-tag-name">{{ tag.name }}</span>
                  <span class="drawer-tag-count">{{ tag.count }}</span>
                </NuxtLink>
              </li>
            </ul>
            <NuxtLink to="/tags" class="drawer-view-all" @click="emit('close')">
              View all tags &rarr;
            </NuxtLink>
          </div>
        </aside>
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
  { label: 'Articles', path: '/article' },
  { label: 'Tags', path: '/tags' },
  // { label: 'About', path: '/about' },
]

// ドロワーに表示するタグは記事数上位のみ(残りは /tags で誘導)
const TOP_TAGS_LIMIT = 10
const { data: tags } = useArticleTags()
const topTags = computed(() => (tags.value ?? []).slice(0, TOP_TAGS_LIMIT))
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
  color: var(--color-text-main);
  text-decoration: none;
  transition: color 0.2s;
}

.nav-item:hover {
  color: var(--color-accent);
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

.mobile-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: 80%;
  max-width: 320px;
  height: 100%;
  background-color: #fff;
  border-left: 1px solid var(--color-border);
  padding: 1.5rem 1.25rem 2rem;
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
}

.mobile-menu-overlay.is-open .mobile-drawer {
  transform: translateX(0);
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.mobile-nav-item {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-main);
  text-decoration: none;
}

.drawer-section {
  padding-top: 1.5rem;
}

.drawer-section-title {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-sub);
}

.drawer-tag-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.drawer-tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.25rem;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  color: var(--color-text-main);
}

.drawer-tag-item:hover {
  color: var(--color-accent);
  background-color: var(--color-code-bg);
}

.drawer-tag-name {
  font-family: var(--font-mono);
}

.drawer-tag-count {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-text-sub);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  padding: 0.05rem 0.5rem;
}

.drawer-view-all {
  display: inline-block;
  margin-top: 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-accent);
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
