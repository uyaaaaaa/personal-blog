import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

export const useTocActive = (links: Ref<TocLink[]>, offset = 140) => {
  /**
   * 現在読んでいる見出し（ビューポート上部を最後に通過した見出し）のIDを追跡する
   * @param links 目次リンク（h3の children を含む）
   * @param offset 見出しを「通過した」と判定するビューポート上端からの距離（px）。
   *               固定ヘッダーやモバイル目次バーの高さ分を考慮する
   */
  const activeId = ref('')

  // 記事内の出現順（=目次の表示順）にフラット化したID一覧
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

    // ページ最下部では最後の見出しが offset に届かなくても最終セクションを読んでいる
    const scrollBottom = window.scrollY + window.innerHeight
    if (scrollBottom >= document.documentElement.scrollHeight - 2) {
      current = ids.value[ids.value.length - 1] ?? current
    }

    activeId.value = current
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  })

  return {
    activeId
  }
}
