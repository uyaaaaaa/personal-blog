import { ref, computed, type Ref } from 'vue'
import { useScrollFrame } from './useScrollFrame'

interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

export const useTocActive = (links: Ref<TocLink[]>, offset: number, enabled: Ref<boolean>) => {
  const activeId = ref('')

  const ids = computed(() => {
    const result: string[] = []
    for (const link of links.value || []) {
      result.push(link.id)
      for (const child of link.children || []) {
        result.push(child.id)
      }
    }
    return result
  })

  const update = () => {
    let current = ''
    for (const id of ids.value) {
      const el = document.getElementById(id)
      if (!el) continue
      if (el.getBoundingClientRect().top <= offset) {
        current = id
      } else {
        break
      }
    }

    const scrollBottom = window.scrollY + window.innerHeight
    if (scrollBottom >= document.documentElement.scrollHeight - 2) {
      current = ids.value[ids.value.length - 1] ?? current
    }

    activeId.value = current
  }

  useScrollFrame(update, enabled)

  return {
    activeId,
  }
}
