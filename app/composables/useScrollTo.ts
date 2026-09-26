const SETTLED_FRAMES = 4
const JUMP_LIMIT_MS = 1200

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const scrollBehavior = (): ScrollBehavior =>
	window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth'

const isJumping = ref(false)

let frame: number | undefined

const trackJump = () => {
	if (frame !== undefined) cancelAnimationFrame(frame)

	isJumping.value = true

	const startedAt = performance.now()
	let lastY: number | undefined
	let stillFrames = 0

	const step = () => {
		const currentY = window.scrollY
		stillFrames = currentY === lastY ? stillFrames + 1 : 0
		lastY = currentY

		if (stillFrames >= SETTLED_FRAMES || performance.now() - startedAt > JUMP_LIMIT_MS) {
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

		element.scrollIntoView({ behavior: scrollBehavior() })
		trackJump()

		history.pushState(null, '', `#${id}`)
	}

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: scrollBehavior() })
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
