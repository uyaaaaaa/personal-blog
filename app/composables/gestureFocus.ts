const POINTER_ATTRIBUTE = 'data-pointer-focus'

let byPointer = false

const onPointerdown = () => {
	byPointer = true
}

const onKeydown = (event: KeyboardEvent) => {
	byPointer = false

	if (event.key === 'Tab' && document.activeElement instanceof HTMLElement) {
		document.activeElement.removeAttribute(POINTER_ATTRIBUTE)
	}
}

if (import.meta.client) {
	document.addEventListener('pointerdown', onPointerdown, true)
	document.addEventListener('keydown', onKeydown, true)
}

const unmark = (event: FocusEvent) => {
	if (event.currentTarget instanceof HTMLElement) {
		event.currentTarget.removeAttribute(POINTER_ATTRIBUTE)
	}
}

export const focusByGesture = (
	element: HTMLElement | null | undefined,
	options?: { asPointer?: boolean; preventScroll?: boolean },
) => {
	if (!element) return

	element.removeAttribute(POINTER_ATTRIBUTE)
	element.focus({ preventScroll: options?.preventScroll })

	if ((options?.asPointer || byPointer) && document.activeElement === element) {
		element.setAttribute(POINTER_ATTRIBUTE, '')
		element.addEventListener('blur', unmark, { once: true })
	}
}

export const focusMainContent = () => {
	focusByGesture(document.getElementById('main-content'), { preventScroll: true })
}
