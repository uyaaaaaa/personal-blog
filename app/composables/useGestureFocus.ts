// この目印を見て輪郭を外すのは app/layouts/default.vue のグローバルな style
const POINTER_ATTRIBUTE = 'data-pointer-focus'

let byPointer = false
let listening = false

const onPointerdown = () => {
	byPointer = true
}

const onKeydown = () => {
	byPointer = false
}

// 直前の操作はページのどこで起きてもよく、外す先も無いので、購読はアプリで1本だけ持つ
const listen = () => {
	if (listening) return

	listening = true
	document.addEventListener('pointerdown', onPointerdown, true)
	document.addEventListener('keydown', onKeydown, true)
}

const unmark = (event: FocusEvent) => {
	if (event.currentTarget instanceof HTMLElement) {
		event.currentTarget.removeAttribute(POINTER_ATTRIBUTE)
	}
}

// テキスト入力はポインタでフォーカスを移しても :focus-visible に一致するので、
// 輪郭を出すかどうかをブラウザの判定に任せられない
const focusByGesture = (element: HTMLElement | null | undefined) => {
	if (!element) return

	element.removeAttribute(POINTER_ATTRIBUTE)

	if (byPointer) {
		element.setAttribute(POINTER_ATTRIBUTE, '')
		// 同じ関数なら重ねて登録されない（DOM が type と callback で重複を見る）
		element.addEventListener('blur', unmark, { once: true })
	}

	element.focus()
}

export const useGestureFocus = () => {
	onMounted(listen)

	return { focusByGesture }
}
