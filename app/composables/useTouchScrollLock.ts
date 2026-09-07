// iOS Safari は body の overflow: hidden ではタッチのパンを止めないので、被せている間は
// touchmove を止めて背後のページを動かさない。止めるのは被せた側の中に来た指だけで、
// ページ全体では止めない

// 中でスクロールできる要素の上なら、そのスクロールに任せる。端まで来たあとの連鎖は
// overscroll-behavior が止める
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

// 閉じている間の指は、visibility: hidden の要素が当たり判定を持たないので届かない。
// 付けたままにして、閉じるアニメーションで見えている間も止め続ける
export const useTouchScrollLock = () => {
	const lockRef = ref<HTMLElement | null>(null)

	const onTouchMove = (event: TouchEvent) => {
		// スクロールが始まったあとの touchmove は cancelable ではない。preventDefault は
		// 通らず、コンソールに警告だけが出る
		if (!event.cancelable) return

		// ピンチは指2本で来る。ここで止めると拡大ごと殺す
		if (event.touches.length > 1) return

		const root = lockRef.value
		if (!root || startsInScroller(event.target, root)) return

		event.preventDefault()
	}

	// touchmove は既定が passive のブラウザがあり、passive のままだと preventDefault が
	// 黙って捨てられる。明示して付ける
	onMounted(() => lockRef.value?.addEventListener('touchmove', onTouchMove, { passive: false }))
	onBeforeUnmount(() => lockRef.value?.removeEventListener('touchmove', onTouchMove))

	return { lockRef }
}
