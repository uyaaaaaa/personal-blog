// 器と中の項目の矩形から、器をどれだけ動かすかを出す。器の取得・いつ動かすかは呼び出し側が持つ
export interface Box {
	top: number
	bottom: number
	height: number
}

export const deltaToReveal = (container: Box, item: Box): number => {
	if (item.top < container.top) return item.top - container.top
	if (item.bottom > container.bottom) return item.bottom - container.bottom
	return 0
}

export const deltaToCenter = (container: Box, item: Box): number => {
	return item.top - container.top - container.height / 2 + item.height / 2
}

export const deltaToCenterIfHidden = (container: Box, item: Box): number => {
	return deltaToReveal(container, item) === 0 ? 0 : deltaToCenter(container, item)
}
