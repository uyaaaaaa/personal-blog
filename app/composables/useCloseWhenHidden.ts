import { useScrollFrame } from '~/composables/useScrollFrame'

export const useCloseWhenHidden = (
	isOpen: Ref<boolean>,
	host: Ref<HTMLElement | null>,
	close: () => void,
) => {
	const read = () => {
		const element = host.value
		if (isOpen.value && element && element.getClientRects().length === 0) close()
	}

	useScrollFrame(read, isOpen)
}
