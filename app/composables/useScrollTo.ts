export const useScrollTo = () => {
  /**
   * スムーズスクロールを実行し、URLハッシュを更新する
   * @param id ターゲット要素のID
   * @param offset ヘッダー等の高さ分オフセット（px）
   */
  const scrollTo = (id: string, offset: number) => {
    const element = document.getElementById(id)
    if (!element) return

    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.scrollY - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })

    // Update URL hash without jumping
    history.pushState(null, '', `#${id}`)
  }

  return {
    scrollTo
  }
}
