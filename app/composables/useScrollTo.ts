import { ref } from 'vue'

export const isProgrammaticScroll = ref(false)

let settleTimer: ReturnType<typeof setTimeout> | undefined
let settleListener: (() => void) | undefined

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
  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (!element) return

    trackProgrammaticScroll()
    element.scrollIntoView({ behavior: 'smooth' })

    history.pushState(null, '', `#${id}`)
  }

  const scrollToTop = () => {
    trackProgrammaticScroll()
    window.scrollTo({ top: 0, behavior: 'smooth' })

    history.replaceState(null, '', location.pathname + location.search)
  }

  return {
    scrollTo,
    scrollToTop,
    beginProgrammaticScroll: trackProgrammaticScroll
  }
}
