import { useScrollFrame } from '~/composables/useScrollFrame'

const cover = (host: HTMLElement) => {
	for (
		let node: HTMLElement = host;
		node !== document.body && node.parentElement;
		node = node.parentElement
	) {
		for (const sibling of node.parentElement.children) {
			if (sibling === node || sibling.hasAttribute('inert')) continue

			sibling.setAttribute('inert', '')
		}
	}
}

export const releaseBackdrop = () => {
	for (const element of document.querySelectorAll('[inert]')) element.removeAttribute('inert')
}

export const useBackdropInert = (isOpen: Ref<boolean>, host: Ref<HTMLElement | null>) => {
	const read = () => {
		const element = host.value
		if (isOpen.value && element && element.getClientRects().length > 0) cover(element)
		else releaseBackdrop()
	}

	useScrollFrame(read, isOpen)

	watch(isOpen, (open) => {
		if (!open) releaseBackdrop()
	})

	onBeforeUnmount(releaseBackdrop)
}
