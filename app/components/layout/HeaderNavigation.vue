<template>
  <div class="flex items-stretch">
    <div
      ref="exploreRef"
      class="explore hidden md:flex"
      @mouseenter="openPanel"
      @mouseleave="scheduleClosePanel"
      @focusout="onPanelFocusout"
      @keydown.escape="dismissPanel"
    >
      <button
        ref="triggerRef"
        type="button"
        class="explore-trigger"
        aria-haspopup="true"
        aria-controls="header-menu-panel"
        :aria-expanded="isPanelOpen"
        @click="isPanelOpen = !isPanelOpen"
      >
        Explore
      </button>

      <HeaderMenuPanel id="header-menu-panel" :is-open="isPanelOpen">
        <HeaderMenuColumn label="Latest" to="/article">
          <ul class="menu-list">
            <li v-for="article in latestItems" :key="article.path">
              <NuxtLink :to="article.path" class="menu-article">
                <span class="menu-article-title">{{ article.title }}</span>
                <time class="menu-article-date" :datetime="article.date">{{ article.dateLabel }}</time>
              </NuxtLink>
            </li>
          </ul>
        </HeaderMenuColumn>

        <HeaderMenuColumn label="Tags" to="/tags">
          <ul class="menu-list menu-list-split">
            <li v-for="tag in topTags" :key="tag.slug">
              <NuxtLink :to="`/tags/${tag.slug}`" class="menu-tag">
                <span class="menu-tag-name">{{ tag.name }}</span>
                <span class="menu-tag-count">{{ tag.count }}</span>
              </NuxtLink>
            </li>
          </ul>
        </HeaderMenuColumn>
      </HeaderMenuPanel>
    </div>

    <div class="md:hidden flex items-center">
      <button
        class="mobile-menu-btn"
        @click="emit('toggle')"
        aria-label="Open menu"
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
          <div class="drawer-header">
            <button type="button" class="drawer-close" aria-label="Close menu" @click="emit('close')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <nav class="drawer-nav">
            <NuxtLink to="/" class="drawer-row" @click="emit('close')">
              <svg class="drawer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5.5 9.5V20h13V9.5" />
              </svg>
              <span class="drawer-row-label">Home</span>
            </NuxtLink>

            <p class="drawer-section-label">Explore</p>

            <button
              type="button"
              class="drawer-row"
              :aria-expanded="isLatestOpen"
              aria-controls="drawer-group-latest"
              @click="isLatestOpen = !isLatestOpen"
            >
              <svg class="drawer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
              <span class="drawer-row-label">Latest</span>
              <svg class="drawer-chevron" :class="{ 'is-open': isLatestOpen }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div id="drawer-group-latest" class="drawer-collapse" :class="{ 'is-open': isLatestOpen }">
              <ul class="drawer-sublist">
                <li v-for="article in latestItems" :key="article.path">
                  <NuxtLink :to="article.path" class="drawer-subrow" @click="emit('close')">
                    <span class="drawer-subrow-title">{{ article.title }}</span>
                    <time class="drawer-subrow-meta" :datetime="article.date">{{ article.dateLabel }}</time>
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <button
              type="button"
              class="drawer-row"
              :aria-expanded="isTagsOpen"
              aria-controls="drawer-group-tags"
              @click="isTagsOpen = !isTagsOpen"
            >
              <svg class="drawer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 3h8l10 10-8 8L3 11V3Z" />
                <circle cx="7.5" cy="7.5" r="1.5" />
              </svg>
              <span class="drawer-row-label">Tags</span>
              <svg class="drawer-chevron" :class="{ 'is-open': isTagsOpen }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div id="drawer-group-tags" class="drawer-collapse" :class="{ 'is-open': isTagsOpen }">
              <ul class="drawer-sublist">
                <li v-for="tag in topTags" :key="tag.slug">
                  <NuxtLink :to="`/tags/${tag.slug}`" class="drawer-subrow drawer-subrow-tag" @click="emit('close')">
                    <span class="drawer-subrow-name">{{ tag.name }}</span>
                    <span class="drawer-subrow-count">{{ tag.count }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </nav>
        </aside>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import HeaderMenuPanel from '@/components/layout/HeaderMenuPanel.vue'
import HeaderMenuColumn from '@/components/layout/HeaderMenuColumn.vue'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'close'): void
}>()

const PANEL_CLOSE_DELAY_MS = 150
const TOP_TAGS_LIMIT = 10
const LATEST_ARTICLES_LIMIT = 5

const isLatestOpen = ref(false)
const isTagsOpen = ref(false)

const { data: tags } = useArticleTags()
const topTags = computed(() => (tags.value ?? []).slice(0, TOP_TAGS_LIMIT))

const { data: latestArticles } = useAsyncData('header-latest-articles', () =>
  queryCollection('article')
    .where('published', '=', true)
    .order('date', 'DESC')
    .limit(LATEST_ARTICLES_LIMIT)
    .select('path', 'title', 'date')
    .all(),
)

const now = ref<number | null>(null)

const latestItems = computed(() =>
  (latestArticles.value ?? []).map((article) => ({
    ...article,
    dateLabel: formatRelativeDate(article.date, now.value),
  })),
)

const isPanelOpen = ref(false)
const exploreRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
let panelCloseTimer: ReturnType<typeof setTimeout> | undefined

const closePanel = () => {
  clearTimeout(panelCloseTimer)
  isPanelOpen.value = false
}

const openPanel = () => {
  clearTimeout(panelCloseTimer)
  isPanelOpen.value = true
}

const scheduleClosePanel = () => {
  clearTimeout(panelCloseTimer)
  panelCloseTimer = setTimeout(closePanel, PANEL_CLOSE_DELAY_MS)
}

const dismissPanel = () => {
  if (!isPanelOpen.value) return
  closePanel()
  triggerRef.value?.focus()
}

const onPanelFocusout = (event: FocusEvent) => {
  if (!exploreRef.value?.contains(event.relatedTarget as Node | null)) closePanel()
}

const onDocumentClick = (event: MouseEvent) => {
  if (!exploreRef.value?.contains(event.target as Node)) closePanel()
}

const route = useRoute()
watch(() => route.fullPath, closePanel)

onMounted(() => {
  now.value = Date.now()
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  clearTimeout(panelCloseTimer)
})
</script>

<style scoped>
/* 表示・非表示の切り替えはTailwindの md: に統一しているため、displayはここで指定しない */
.explore {
  align-items: stretch;
}

.explore-trigger {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-main);
  cursor: pointer;
  transition: color 0.2s;
}

.explore-trigger:hover,
.explore-trigger[aria-expanded="true"] {
  color: var(--color-accent);
}

.explore-trigger::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background-color: var(--color-accent);
  opacity: 0;
  transition: opacity 0.2s;
}

.explore-trigger[aria-expanded="true"]::after {
  opacity: 1;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-list-split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(5, auto);
  grid-auto-flow: column;
  gap: 0 1rem;
}

.menu-article,
.menu-tag {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  color: var(--color-main);
  transition: background-color 0.15s;
}

.menu-article:hover,
.menu-tag:hover {
  background-color: var(--color-surface-subtle);
}

.menu-tag {
  justify-content: space-between;
  gap: 0.5rem;
}

.menu-article-title {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-article-date {
  flex: none;
  width: 6rem;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-sub);
  font-variant-numeric: tabular-nums;
}

.menu-tag-name {
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-tag-count {
  flex: none;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-sub);
  font-variant-numeric: tabular-nums;
}

.mobile-menu-btn {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20px;
  height: 15px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.hamburger-line {
  display: block;
  width: 100%;
  height: 2px;
  background-color: var(--color-main);
  border-radius: 2px;
  transition: all 0.3s ease-in-out;
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background-color: var(--color-overlay);
  z-index: 110;
  opacity: 0;
  visibility: hidden;
  overflow: hidden;
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
  background-color: var(--color-surface);
  border-left: 1px solid var(--color-border);
  padding: 0 0.75rem 2rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
}

.mobile-menu-overlay.is-open .mobile-drawer {
  transform: translateX(0);
}

.drawer-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 64px;
  margin: 0 -0.75rem 0.5rem;
  padding: 0 0.5rem;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  background: none;
  color: var(--color-main);
  cursor: pointer;
}

.drawer-close svg {
  width: 20px;
  height: 20px;
}

.drawer-close:hover {
  background-color: var(--color-surface-subtle);
}

.drawer-nav {
  display: flex;
  flex-direction: column;
}

.drawer-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: none;
  border-radius: 0.5rem;
  background: none;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: left;
  color: var(--color-main);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.drawer-row:hover {
  background-color: var(--color-surface-subtle);
}

.drawer-row.router-link-exact-active {
  background-color: var(--color-surface-subtle);
  font-weight: 600;
}

.drawer-icon {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--color-sub);
}


.drawer-row-label {
  flex: 1;
  min-width: 0;
}

.drawer-chevron {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--color-sub);
  transform: rotate(-90deg);
  transition: transform 0.2s ease-in-out;
}

.drawer-chevron.is-open {
  transform: rotate(0deg);
}

.drawer-section-label {
  margin: 1.25rem 0 0.375rem;
  padding: 0 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--color-sub);
}

.drawer-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease-in-out;
}

.drawer-collapse.is-open {
  grid-template-rows: 1fr;
}

.drawer-sublist {
  list-style: none;
  min-height: 0;
  margin: 0 0 0 1.5rem;
  padding: 0;
  overflow: hidden;
  border-left: 1px solid var(--color-border);
  visibility: hidden;
  transition: visibility 0.25s ease-in-out;
}

.drawer-collapse.is-open .drawer-sublist {
  visibility: visible;
}

.drawer-subrow {
  display: block;
  padding: 0.5rem 0.625rem;
  margin-left: 0.25rem;
  border-radius: 0.375rem;
  color: var(--color-main);
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.drawer-subrow:hover {
  background-color: var(--color-surface-subtle);
}

.drawer-subrow.router-link-exact-active {
  background-color: var(--color-surface-subtle);
  font-weight: 600;
}

.drawer-subrow-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 0.875rem;
  line-height: 1.5;
}

.drawer-subrow-meta {
  display: block;
  margin-top: 0.125rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-sub);
}

.drawer-subrow-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.drawer-subrow-name {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-subrow-count {
  flex: none;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-sub);
}
</style>
