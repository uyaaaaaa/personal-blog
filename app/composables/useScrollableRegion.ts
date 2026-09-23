// scrollWidth と clientWidth は整数に丸まるので、端数だけの差が 1px の溢れに見える
const ROUNDING = 1

export const useScrollableRegion = (host: Ref<HTMLElement | null>, label: string) => {
	const overflows = ref(false)

	const read = () => {
		const element = host.value
		if (element === null) {
			overflows.value = false
			return
		}

		// 読んでいる箱をタブ順から外すと、ブラウザは焦点を body に戻す。読んでいた位置が消えるので残す
		overflows.value =
			element.scrollWidth - element.clientWidth > ROUNDING ||
			document.activeElement === element
	}

	let observer: ResizeObserver | undefined
	let watched: HTMLElement | undefined

	onMounted(() => {
		const element = host.value
		if (element === null) return

		watched = element
		observer = new ResizeObserver(read)
		// 箱の幅は画面で、中身の幅は字の差し替えで変わる。どちらが動いても溢れは変わる
		observer.observe(element)
		for (const child of element.children) observer.observe(child)
		// 焦点のために残した停止は、読み終わった時点で畳む
		element.addEventListener('blur', read)
	})

	onUnmounted(() => {
		observer?.disconnect()
		observer = undefined
		watched?.removeEventListener('blur', read)
		watched = undefined
	})

	// role の無い要素の名前は読み上げられず、ランドマークだと箱の数だけ一覧に並ぶので group にする
	return computed(() =>
		overflows.value ? { tabindex: 0, role: 'group', 'aria-label': label } : {},
	)
}
