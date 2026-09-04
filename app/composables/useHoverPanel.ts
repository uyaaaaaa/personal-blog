import { onBeforeUnmount, onMounted, ref } from 'vue'

const CLOSE_DELAY_MS = 150

export const useHoverPanel = () => {
	const isOpen = ref(false)
	const rootRef = ref<HTMLElement | null>(null)
	const triggerRef = ref<HTMLButtonElement | null>(null)

	let closeTimer: ReturnType<typeof setTimeout> | undefined

	const close = () => {
		clearTimeout(closeTimer)
		isOpen.value = false
	}

	const open = () => {
		clearTimeout(closeTimer)
		isOpen.value = true
	}

	const toggle = () => {
		if (isOpen.value) close()
		else open()
	}

	// タッチ操作はタップのたびに互換マウスイベント（mouseenter → click）を発火させるため、
	// ホバーでの開閉はマウスのポインタに限定してclickのトグルと衝突させない
	const openOnHover = (event: PointerEvent) => {
		if (event.pointerType === 'mouse') open()
	}

	const scheduleCloseOnHover = (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return

		clearTimeout(closeTimer)
		closeTimer = setTimeout(close, CLOSE_DELAY_MS)
	}

	const dismiss = () => {
		if (!isOpen.value) return

		close()
		triggerRef.value?.focus()
	}

	const onFocusout = (event: FocusEvent) => {
		if (!rootRef.value?.contains(event.relatedTarget as Node | null)) close()
	}

	const onDocumentClick = (event: MouseEvent) => {
		if (!rootRef.value?.contains(event.target as Node)) close()
	}

	onMounted(() => {
		document.addEventListener('click', onDocumentClick)
	})

	onBeforeUnmount(() => {
		document.removeEventListener('click', onDocumentClick)
		clearTimeout(closeTimer)
	})

	return {
		isOpen,
		rootRef,
		triggerRef,
		open,
		close,
		toggle,
		openOnHover,
		scheduleCloseOnHover,
		dismiss,
		onFocusout,
	}
}
