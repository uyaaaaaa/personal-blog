import { beginProgrammaticScroll } from './useProgrammaticScroll'

export const useScrollTo = () => {
	const scrollTo = (id: string) => {
		const element = document.getElementById(id)
		if (!element) return

		beginProgrammaticScroll()
		element.scrollIntoView({ behavior: 'smooth' })

		history.pushState(null, '', `#${id}`)
	}

	const scrollToTop = () => {
		beginProgrammaticScroll()
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const clearHash = () => {
		history.replaceState(null, '', location.pathname + location.search)
	}

	return {
		scrollTo,
		scrollToTop,
		clearHash,
	}
}
