import { useScrollFrame } from '~/composables/useScrollFrame'

// 横に溢れた箱は、ポインタを持たない利用者には右端が読めない。溢れている間だけタブ順に入れ、
// 溢れていない箱は読むもののない停止になるので入れない
export const useScrollableRegion = (host: Ref<HTMLElement | null>, label: string) => {
	const overflows = ref(false)

	const read = () => {
		const element = host.value
		overflows.value = element !== null && element.scrollWidth > element.clientWidth
	}

	// 溢れるかは幅で決まるので、マウントしている間は読み続ける
	useScrollFrame(read, ref(true))

	return computed(() =>
		overflows.value ? { tabindex: 0, role: 'region', 'aria-label': label } : {},
	)
}
