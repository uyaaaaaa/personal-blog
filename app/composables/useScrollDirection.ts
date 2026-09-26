import { useScrollFrame } from './useScrollFrame'
import { useScrollTo } from './useScrollTo'

const RESTING = 'up'

// threshold: 方向を更新する最小スクロール量（px）。微小なスクロールによるちらつきを防ぐ
export const useScrollDirection = (threshold: number, enabled: Ref<boolean>) => {
	const direction = ref<'up' | 'down'>(RESTING)

	const { isJumping } = useScrollTo()

	let lastY: number | undefined

	const update = () => {
		const currentY = Math.max(0, window.scrollY)

		if (lastY === undefined) {
			lastY = currentY
			return
		}

		if (isJumping.value) {
			direction.value = RESTING
			lastY = currentY
			return
		}

		if (Math.abs(currentY - lastY) < threshold) return

		direction.value = currentY > lastY ? 'down' : 'up'
		lastY = currentY
	}

	useScrollFrame(update, enabled)

	return {
		direction,
	}
}
