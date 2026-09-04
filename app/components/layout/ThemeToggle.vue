<template>
  <div
    ref="rootRef"
    class="theme-toggle"
    @pointerenter="openPanelOnHover"
    @pointerleave="scheduleClosePanelOnHover"
    @focusout="onPanelFocusout"
    @keydown.escape="dismissPanel"
  >
    <button
      ref="triggerRef"
      type="button"
      class="theme-trigger"
      aria-label="Theme"
      aria-haspopup="menu"
      aria-controls="theme-menu-panel"
      :aria-expanded="isPanelOpen"
      @click="togglePanel"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:hidden" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
      </svg>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden dark:block" aria-hidden="true">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path>
        <path d="m17.66 17.66 1.41 1.41"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="m6.34 17.66-1.41 1.41"></path>
        <path d="m19.07 4.93-1.41 1.41"></path>
      </svg>
    </button>

    <div
      id="theme-menu-panel"
      class="theme-panel shadow-lg"
      :class="{ 'is-open': isPanelOpen }"
      role="menu"
      aria-label="Theme"
    >
      <button type="button" class="theme-option" :class="{ 'is-selected': isSelected('light') }" role="menuitemradio" :aria-checked="isSelected('light')" @click="select('light')">
        <svg class="theme-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2"></path>
          <path d="M12 20v2"></path>
          <path d="m4.93 4.93 1.41 1.41"></path>
          <path d="m17.66 17.66 1.41 1.41"></path>
          <path d="M2 12h2"></path>
          <path d="M20 12h2"></path>
          <path d="m6.34 17.66-1.41 1.41"></path>
          <path d="m19.07 4.93-1.41 1.41"></path>
        </svg>
        <span class="theme-option-label">Light</span>
      </button>

      <button type="button" class="theme-option" :class="{ 'is-selected': isSelected('dark') }" role="menuitemradio" :aria-checked="isSelected('dark')" @click="select('dark')">
        <svg class="theme-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
        </svg>
        <span class="theme-option-label">Dark</span>
      </button>

      <button type="button" class="theme-option" :class="{ 'is-selected': isSelected('system') }" role="menuitemradio" :aria-checked="isSelected('system')" @click="select('system')">
        <svg class="theme-option-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="13" rx="2"></rect>
          <path d="M9 21h6"></path>
          <path d="M12 17v4"></path>
        </svg>
        <span class="theme-option-label">System</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHoverPanel } from '~/composables/useHoverPanel'

type ThemePreference = 'light' | 'dark' | 'system'

const colorMode = useColorMode()

const {
  isOpen: isPanelOpen,
  rootRef,
  triggerRef,
  toggle: togglePanel,
  openOnHover: openPanelOnHover,
  scheduleCloseOnHover: scheduleClosePanelOnHover,
  dismiss: dismissPanel,
  onFocusout: onPanelFocusout,
} = useHoverPanel()

const isMounted = ref(false)

const isSelected = (preference: ThemePreference) => isMounted.value && colorMode.preference === preference

const select = (preference: ThemePreference) => {
  colorMode.preference = preference
  dismissPanel()
}

onMounted(() => {
  isMounted.value = true
})
</script>

<style scoped>
.theme-toggle {
  position: relative;
  display: flex;
  align-items: center;
}

.theme-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  background: none;
  color: var(--color-sub);
  cursor: pointer;
  transition: color 0.2s;
}

.theme-trigger:hover,
.theme-trigger[aria-expanded="true"] {
  color: var(--color-accent);
}

.theme-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 10rem;
  padding: 0.5rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.16s ease-out, transform 0.16s ease-out, visibility 0.16s;
}

.theme-panel.is-open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: none;
  font-family: inherit;
  font-size: 0.875rem;
  text-align: left;
  color: var(--color-main);
  cursor: pointer;
  transition: background-color 0.15s;
}

.theme-option:hover {
  background-color: var(--color-surface-subtle);
}

.theme-option.is-selected {
  background-color: var(--color-surface-subtle);
  font-weight: 600;
}

.theme-option-icon {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--color-sub);
}

.theme-option-label {
  flex: 1;
  min-width: 0;
}
</style>
