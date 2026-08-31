import { ref } from 'vue'

/**
 * 目次リンク等によるプログラムスクロールが進行中かどうか。
 * モバイル目次バー（TocMobile）の表示制御が useScrollDirection 経由で参照する
 */
export const isProgrammaticScroll = ref(false)

let settleTimer: ReturnType<typeof setTimeout> | undefined
let settleListener: (() => void) | undefined

// スクロールイベントが一定時間止まったらプログラムスクロール終了とみなす
// （scrollend イベントは Safari の対応が新しいためデバウンスで代用）
const trackProgrammaticScroll = () => {
  isProgrammaticScroll.value = true

  if (settleListener) window.removeEventListener('scroll', settleListener)

  const settle = () => {
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      isProgrammaticScroll.value = false
      if (settleListener) {
        window.removeEventListener('scroll', settleListener)
        settleListener = undefined
      }
    }, 150)
  }

  settleListener = settle
  window.addEventListener('scroll', settle, { passive: true })
  // ターゲットが既に表示位置にありスクロールが一切発生しないケースの保険
  settle()
}

export const useScrollTo = () => {
  /**
   * ページ内見出しへスムーズスクロールし、URLハッシュを更新する。
   * 着地位置（固定ヘッダー分の余白）は見出し側の CSS scroll-margin-top が決める
   * @param id ターゲット要素のID
   */
  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (!element) return

    trackProgrammaticScroll()
    element.scrollIntoView({ behavior: 'smooth' })

    // Update URL hash without jumping
    history.pushState(null, '', `#${id}`)
  }

  return {
    scrollTo
  }
}
