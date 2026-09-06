const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 閉じた列や被せる前の中身は DOM に残したまま visibility と display で隠しているので、
// セレクタだけでは Tab の止まらない要素まで拾ってしまう。display: none は
// 算出値の visibility に出ないため、箱が取れるかどうかで見る
const isTabbable = (element: HTMLElement) =>
	getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0

// onEscape を渡すと、被せている間の Escape も同じ listener で受ける。開いた直後の
// focus はまだ外にあり、閉じ込めも Tab を押すまでは中に引き込まないため、被せた側の
// 要素ではなく window で受ける必要がある
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

		// 行き先が無いまま止めると、開き際の数フレームと md を跨いだ後で
		// Tab がどこにも進まなくなる。閉じ込めを諦めて移動を残す
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
