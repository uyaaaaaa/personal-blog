import { ref, onMounted, onUnmounted } from 'vue'
import { isProgrammaticScroll } from './useScrollTo'

// threshold: 方向を更新する最小スクロール量（px）。微小なスクロールによるちらつきを防ぐ
export const useScrollDirection = (threshold = 8) => {
  const direction = ref<'up' | 'down'>('up')

  let lastY = 0

  const handleScroll = () => {
    const currentY = Math.max(0, window.scrollY)

    if (isProgrammaticScroll.value) {
      direction.value = 'down'
      lastY = currentY
      return
    }

    if (Math.abs(currentY - lastY) < threshold) return

    direction.value = currentY > lastY ? 'down' : 'up'
    lastY = currentY
  }

  onMounted(() => {
    lastY = Math.max(0, window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  return {
    direction
  }
}
