import { ref, onMounted, onUnmounted } from 'vue'
import { isProgrammaticScroll } from './useScrollTo'

// threshold: 方向を更新する最小スクロール量（px）。微小なスクロールによるちらつきを防ぐ
export const useScrollDirection = (threshold = 8) => {
  const direction = ref<'up' | 'down'>('up')

  let lastY = 0

  const handleScroll = () => {
    // iOSのラバーバンドスクロールで負値になるためクランプする
    const currentY = Math.max(0, window.scrollY)

    // 目次リンク等によるプログラムスクロールは向きに関わらず「下」として扱う。
    // 上方向へのジャンプでモバイル目次バーが出てきて見出しに被るのを防ぎ、
    // 着地位置を方向によらず一定にするため（バーを再表示したければ少し上スクロールすればよい）
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
