const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 閉じた列や被せる前の中身は DOM に残したまま visibility で隠しているので、
// セレクタだけでは Tab の止まらない要素まで拾ってしまう
const isTabbable = (element: HTMLElement) => getComputedStyle(element).visibility !== 'hidden'

export const useFocusTrap = (isOpen: Ref<boolean>) => {
	const trapRef = ref<HTMLElement | null>(null)

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Tab') return

		const root = trapRef.value
		if (!root) return

		const tabbables = [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
			isTabbable,
		)
		const first = tabbables[0]
		const last = tabbables.at(-1)

		if (!first || !last) {
			event.preventDefault()
			return
		}

		const active = document.activeElement
		const atEdge = event.shiftKey ? active === first : active === last

		if (!atEdge && root.contains(active)) return

		event.preventDefault()
		;(event.shiftKey ? last : first).focus()
	}

	watch(isOpen, (open) => {
		if (open) window.addEventListener('keydown', onKeydown)
		else window.removeEventListener('keydown', onKeydown)
	})

	onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

	return { trapRef }
}
