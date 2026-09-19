import { useScrollFrame } from './useScrollFrame'

interface TocLink {
	id: string
	text: string
	children?: TocLink[]
}

// 着地はスクロール位置の丸めで scroll-margin-top をまたぐ（実測で 115.6〜116.2）。
// ちょうどで切ると、上に出た側の見出しが選ばれない
const SUBPIXEL_SLACK = 1

export const useTocActive = (links: Ref<TocLink[]>, enabled: Ref<boolean>) => {
	const activeId = ref('')

	const ids = computed(() => {
		const result: string[] = []
		for (const link of links.value || []) {
			result.push(link.id)
			for (const child of link.children || []) {
				result.push(child.id)
			}
		}
		return result
	})

	// 見出しが着地する位置は scroll-margin-top が持つ。判定にその数値を写すと、
	// 着地位置を変えたときに片方だけ残って1つ前の見出しが選ばれ続ける
	const landingOffset = (el: HTMLElement) =>
		(parseFloat(getComputedStyle(el).scrollMarginTop) || 0) + SUBPIXEL_SLACK

	const update = () => {
		let current = ''
		let offset: number | undefined

		for (const id of ids.value) {
			const el = document.getElementById(id)
			if (!el) continue

			offset ??= landingOffset(el)
			if (el.getBoundingClientRect().top <= offset) {
				current = id
			} else {
				break
			}
		}

		const scrollBottom = window.scrollY + window.innerHeight
		if (scrollBottom >= document.documentElement.scrollHeight - 2) {
			current = ids.value[ids.value.length - 1] ?? current
		}

		activeId.value = current
	}

	useScrollFrame(update, enabled)

	return {
		activeId,
	}
}
