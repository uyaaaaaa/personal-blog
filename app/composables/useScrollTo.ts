// scrollend を出さないブラウザがあるので、時間でも終わりにする。滑らかな送りが届く上限
const SETTLE_TIMEOUT = 1000

// 送っている間の移動は読者の操作ではない。向きを読む側が、自分で起こした移動を数えないために出す
const isSending = ref(false)

let settle: ReturnType<typeof setTimeout> | undefined

const stopSending = () => {
	clearTimeout(settle)
	window.removeEventListener('scrollend', stopSending)
	isSending.value = false
}

const startSending = () => {
	isSending.value = true

	clearTimeout(settle)
	window.removeEventListener('scrollend', stopSending)
	window.addEventListener('scrollend', stopSending, { once: true })
	settle = setTimeout(stopSending, SETTLE_TIMEOUT)
}

export const useScrollTo = () => {
	const scrollTo = (id: string) => {
		const element = document.getElementById(id)
		if (!element) return

		startSending()
		element.scrollIntoView({ behavior: 'smooth' })

		history.pushState(null, '', `#${id}`)
	}

	const scrollToTop = () => {
		startSending()
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const clearHash = () => {
		history.replaceState(null, '', location.pathname + location.search)
	}

	return {
		scrollTo,
		scrollToTop,
		clearHash,
		isSending,
	}
}
