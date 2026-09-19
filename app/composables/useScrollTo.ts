// 滑り込みが終わったとみなすまでの、位置が動かないフレーム数
const SETTLED_FRAMES = 4
// 途中で指が割り込んで動き続けても、いつまでも送っている扱いにしないための上限（ms）
const JUMP_LIMIT = 1200

// 送っている間の移動は利用者のスクロールではない。向きを読む側がこれを見る
const isJumping = ref(false)

let frame: number | undefined

const trackJump = () => {
	if (frame !== undefined) cancelAnimationFrame(frame)

	isJumping.value = true

	const startedAt = performance.now()
	let lastY: number | undefined
	let still = 0

	const step = () => {
		const currentY = window.scrollY
		still = currentY === lastY ? still + 1 : 0
		lastY = currentY

		if (still >= SETTLED_FRAMES || performance.now() - startedAt > JUMP_LIMIT) {
			frame = undefined
			isJumping.value = false
			return
		}

		frame = requestAnimationFrame(step)
	}

	frame = requestAnimationFrame(step)
}

export const useScrollTo = () => {
	const scrollTo = (id: string) => {
		const element = document.getElementById(id)
		if (!element) return

		element.scrollIntoView({ behavior: 'smooth' })
		trackJump()

		history.pushState(null, '', `#${id}`)
	}

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' })
		trackJump()
	}

	const clearHash = () => {
		history.replaceState(null, '', location.pathname + location.search)
	}

	return {
		scrollTo,
		scrollToTop,
		clearHash,
		isJumping,
	}
}
