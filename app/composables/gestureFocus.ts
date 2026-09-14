// この目印を見て輪郭を外すのは app/layouts/default.vue のグローバルな style
const POINTER_ATTRIBUTE = 'data-pointer-focus'

let byPointer = false

const onPointerdown = () => {
	byPointer = true
}

// フォーカスが動かないキー操作もある。移した先を待たず、今居る要素から落とす
const onKeydown = () => {
	byPointer = false

	if (document.activeElement instanceof HTMLElement) {
		document.activeElement.removeAttribute(POINTER_ATTRIBUTE)
	}
}

// 購読はアプリで1本、ハイドレーションより前に立てる。指のタップは pointerdown だけが
// 先に届き、click はマウント後に来るので、lifecycle で立てると押した指を数え落とす
if (import.meta.client) {
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
export const focusByGesture = (element: HTMLElement | null | undefined) => {
	if (!element) return

	element.removeAttribute(POINTER_ATTRIBUTE)
	element.focus()

	// 隠れている戻し先には focus() が効かない。乗らなかった要素に付けると、blur も
	// keydown も来ないまま残り、後からキーボードで来たときに輪郭を消してしまう
	if (byPointer && document.activeElement === element) {
		element.setAttribute(POINTER_ATTRIBUTE, '')
		// 同じ関数なら重ねて登録されない（DOM が type と callback で重複を見る）
		element.addEventListener('blur', unmark, { once: true })
	}
}
