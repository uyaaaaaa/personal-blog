import { useScrollFrame } from './useScrollFrame'

interface TocLink {
	id: string
	text: string
	children?: TocLink[]
}

// 着地はスクロール位置の丸めで scroll-padding-top を 1px 未満またぐ
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

	const landingOffset = () =>
		(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) +
		SUBPIXEL_SLACK

	const update = () => {
		let current = ''
		const offset = landingOffset()

		for (const id of ids.value) {
			const el = document.getElementById(id)
			if (!el) continue

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
