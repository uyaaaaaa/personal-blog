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

export const deltaToCenterIfHidden = (container: Box, item: Box): number => {
	if (deltaToReveal(container, item) === 0) return 0

	return item.top - container.top - container.height / 2 + item.height / 2
}
