// 横に溢れた箱は、ポインタを持たない利用者には右端が読めない。溢れている間だけタブ順に入れ、
// 溢れていない箱は読むもののない停止になるので入れない
export const useScrollableRegion = (host: Ref<HTMLElement | null>, label: string) => {
	const overflows = ref(false)

	const read = () => {
		const element = host.value
		overflows.value = element !== null && element.scrollWidth > element.clientWidth
	}

	let observer: ResizeObserver | undefined

	onMounted(() => {
		const element = host.value
		if (element === null) return

		observer = new ResizeObserver(read)
		// 箱の幅は画面で、中身の幅は字の差し替えで変わる。どちらが動いても溢れは変わる
		observer.observe(element)
		for (const child of element.children) observer.observe(child)
	})

	onUnmounted(() => {
		observer?.disconnect()
		observer = undefined
	})

	// role を持たない要素に付けた名前は読み上げられない。ランドマークにすると記事の箱の数だけ
	// 同じ名前が一覧に並ぶので、名前だけを持つ group にする
	return computed(() =>
		overflows.value ? { tabindex: 0, role: 'group', 'aria-label': label } : {},
	)
}
