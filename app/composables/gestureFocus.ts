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

export const focusByGesture = (element: HTMLElement | null | undefined) => {
	if (!element) return

	element.removeAttribute(POINTER_ATTRIBUTE)
	element.focus()

	if (byPointer && document.activeElement === element) {
		element.setAttribute(POINTER_ATTRIBUTE, '')
		element.addEventListener('blur', unmark, { once: true })
	}
}
