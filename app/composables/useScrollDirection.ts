import { useScrollFrame } from './useScrollFrame'
import { useScrollTo } from './useScrollTo'

// threshold: 方向を更新する最小スクロール量（px）。微小なスクロールによるちらつきを防ぐ
export const useScrollDirection = (threshold: number, enabled: Ref<boolean>) => {
	const direction = ref<'up' | 'down'>('up')

	const { isJumping } = useScrollTo()

	let lastY: number | undefined

	const update = () => {
		const currentY = Math.max(0, window.scrollY)

		if (lastY === undefined) {
			lastY = currentY
			return
		}

		// 送っている間の移動は利用者のスクロールではない。向きを持たせると、下の見出しへ
		// 飛ぶだけで下向きになり、下向きで隠す側が着地の時点で消えている
		if (isJumping.value) {
			direction.value = 'up'
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
