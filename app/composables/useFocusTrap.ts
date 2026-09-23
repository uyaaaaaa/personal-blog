const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// display: none は算出値の visibility に出ないので、箱が取れるかで見る
const isTabbable = (element: HTMLElement) =>
	getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0

export const useFocusTrap = (isOpen: Ref<boolean>, onEscape?: (event: KeyboardEvent) => void) => {
	const trapRef = ref<HTMLElement | null>(null)

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			onEscape?.(event)
			return
		}

		if (event.key !== 'Tab') return

		const root = trapRef.value
		if (!root) return

		const tabbables = [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
			isTabbable,
		)
		const first = tabbables[0]
		const last = tabbables.at(-1)

		if (!first || !last) return

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
