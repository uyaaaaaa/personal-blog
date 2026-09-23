// iOS Safari は body の overflow: hidden でタッチのパンを止めない

const isScrollable = (element: Element) => {
	const overflowY = getComputedStyle(element).overflowY
	return (
		(overflowY === 'auto' || overflowY === 'scroll') &&
		element.scrollHeight > element.clientHeight
	)
}

const startsInScroller = (target: EventTarget | null, root: HTMLElement) => {
	let element = target instanceof Element ? target : null

	// root 自身は見ない。被せた側の外枠はスクロールせず、そこに来た指を止めるのが本題
	while (element && element !== root) {
		if (isScrollable(element)) return true
		element = element.parentElement
	}

	return false
}

export const useTouchScrollLock = () => {
	const lockRef = ref<HTMLElement | null>(null)

	const onTouchMove = (event: TouchEvent) => {
		// スクロール開始後の touchmove は cancelable でなく、preventDefault は警告を出すだけ
		if (!event.cancelable) return

		// ピンチは指2本で来る。ここで止めると拡大ごと殺す
		if (event.touches.length > 1) return

		const root = lockRef.value
		if (!root || startsInScroller(event.target, root)) return

		event.preventDefault()
	}

	onMounted(() => lockRef.value?.addEventListener('touchmove', onTouchMove, { passive: false }))
	onBeforeUnmount(() => lockRef.value?.removeEventListener('touchmove', onTouchMove))

	return { lockRef }
}
