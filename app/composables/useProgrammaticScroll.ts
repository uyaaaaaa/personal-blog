import { readOnScrollFrame } from './useScrollFrame'

export const isProgrammaticScroll = ref(false)

let settleTimer: ReturnType<typeof setTimeout> | undefined
let stopReading: (() => void) | undefined

const settle = () => {
	clearTimeout(settleTimer)
	settleTimer = setTimeout(() => {
		isProgrammaticScroll.value = false
		stopReading?.()
		stopReading = undefined
	}, 150)
}

export const beginProgrammaticScroll = () => {
	isProgrammaticScroll.value = true

	stopReading ??= readOnScrollFrame(settle)
	// ターゲットが既に表示位置にありスクロールが一切発生しないケースの保険
	settle()
}
