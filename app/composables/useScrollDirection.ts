import { useScrollFrame } from './useScrollFrame'
import { useScrollTo } from './useScrollTo'

// threshold: 方向を更新する最小スクロール量（px）。微小なスクロールによるちらつきを防ぐ
export const useScrollDirection = (threshold: number, enabled: Ref<boolean>) => {
	const direction = ref<'up' | 'down'>('up')

	const { isSending } = useScrollTo()

	let lastY: number | undefined

	const update = () => {
		const currentY = Math.max(0, window.scrollY)

		if (lastY === undefined) {
			lastY = currentY
			return
		}

		// 自分で送った移動に読者の向きは無い。見送るだけだと送る前の向きが残るので、
		// 読み始めと同じ初期値に戻す
		if (isSending.value) {
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
