<template>
  <div
    class="callout my-5 rounded-lg p-3 text-sm"
    :data-callout="normalizedType"
    :style="{ '--callout-rgb': config.rgb }"
  >
    <component
      :is="foldable ? 'button' : 'div'"
      :type="foldable ? 'button' : undefined"
      :aria-expanded="foldable ? isOpen : undefined"
      class="callout-title flex w-full items-center gap-2 text-left font-semibold"
      :class="{ 'cursor-pointer': foldable }"
      @click="foldable && (isOpen = !isOpen)"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0"
        aria-hidden="true"
        v-html="config.icon"
      ></svg>
      <span class="min-w-0">{{ displayTitle }}</span>
      <svg
        v-if="foldable"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 transition-transform duration-200"
        :class="{ 'rotate-90': isOpen }"
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </component>

    <div v-show="isOpen" class="callout-content mt-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  type?: string
  title?: string
  // '-' は初期状態が閉、'+' は初期状態が開の折りたたみcallout
  fold?: string
}>()

// Obsidianデフォルトテーマの色（RGB）とlucideアイコン
const CALLOUT_CONFIG = {
  note: {
    rgb: '8, 109, 221',
    icon: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  },
  abstract: {
    rgb: '0, 191, 188',
    icon: '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  },
  info: {
    rgb: '8, 109, 221',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  },
  todo: {
    rgb: '8, 109, 221',
    icon: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  },
  tip: {
    rgb: '0, 191, 188',
    icon: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  },
  success: {
    rgb: '8, 185, 78',
    icon: '<path d="M20 6 9 17l-5-5"/>',
  },
  question: {
    rgb: '236, 117, 0',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  },
  warning: {
    rgb: '236, 117, 0',
    icon: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  },
  failure: {
    rgb: '233, 49, 71',
    icon: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  },
  danger: {
    rgb: '233, 49, 71',
    icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  },
  bug: {
    rgb: '233, 49, 71',
    icon: '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  },
  example: {
    rgb: '120, 82, 238',
    icon: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  },
  quote: {
    rgb: '158, 158, 158',
    icon: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  },
} as const

// Obsidian互換のエイリアス
const TYPE_ALIASES: Record<string, keyof typeof CALLOUT_CONFIG> = {
  summary: 'abstract',
  tldr: 'abstract',
  hint: 'tip',
  important: 'tip',
  check: 'success',
  done: 'success',
  help: 'question',
  faq: 'question',
  caution: 'warning',
  attention: 'warning',
  fail: 'failure',
  missing: 'failure',
  error: 'danger',
  cite: 'quote',
}

const rawType = computed(() => (props.type || 'note').toLowerCase())

const normalizedType = computed<keyof typeof CALLOUT_CONFIG>(() => {
  const type = rawType.value
  if (type in CALLOUT_CONFIG) return type as keyof typeof CALLOUT_CONFIG
  // 未知のタイプはObsidianと同様にnote扱い
  return TYPE_ALIASES[type] || 'note'
})

const config = computed(() => CALLOUT_CONFIG[normalizedType.value])

const displayTitle = computed(
  () => props.title || rawType.value.charAt(0).toUpperCase() + rawType.value.slice(1)
)

const foldable = computed(() => props.fold === '+' || props.fold === '-')
const isOpen = ref(props.fold !== '-')
</script>

<style scoped>
.callout {
  background-color: rgba(var(--callout-rgb), 0.1);
}

.callout-title {
  color: rgb(var(--callout-rgb));
}

/* prose由来の余白をcallout内で詰める */
.callout-content :deep(> :first-child) {
  margin-top: 0;
}

.callout-content :deep(> :last-child) {
  margin-bottom: 0;
}
</style>
