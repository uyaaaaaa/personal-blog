import { beginProgrammaticScroll } from './useProgrammaticScroll'

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

export const useScrollTo = () => {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (!element) return

    beginProgrammaticScroll()
    element.scrollIntoView({ behavior: scrollBehavior() })

    history.pushState(null, '', `#${id}`)
  }

  const scrollToTop = () => {
    beginProgrammaticScroll()
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
  }

  const clearHash = () => {
    history.replaceState(null, '', location.pathname + location.search)
  }

  return {
    scrollTo,
    scrollToTop,
    clearHash
  }
}
