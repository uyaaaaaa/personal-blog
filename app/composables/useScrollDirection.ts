import { ref, onMounted, onUnmounted } from 'vue'

export const useScrollDirection = (threshold = 8) => {
  /**
   * 画面のスクロール方向（'up' | 'down'）を追跡する
   * @param threshold 方向を更新する最小スクロール量（px）。微小なスクロールによるちらつきを防ぐ
   */
  const direction = ref<'up' | 'down'>('up')

  let lastY = 0

  const handleScroll = () => {
    // iOSのラバーバンドスクロールで負値になるためクランプする
    const currentY = Math.max(0, window.scrollY)

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
