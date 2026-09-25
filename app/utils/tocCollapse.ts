export const TOC_COLLAPSED_KEY = 'toc-collapsed'
export const TOC_COLLAPSED_ATTRIBUTE = 'data-toc-collapsed'

export function followStoredTocCollapse(key: string, attribute: string) {
	const apply = (value: string | null) =>
		document.documentElement.toggleAttribute(attribute, Boolean(value))

	try {
		apply(localStorage.getItem(key))
	} catch {}

	window.addEventListener('storage', (event) => {
		if (event.key === key || event.key === null) apply(event.newValue)
	})
}

export const followStoredTocCollapseScript = `(${followStoredTocCollapse})(${JSON.stringify(TOC_COLLAPSED_KEY)},${JSON.stringify(TOC_COLLAPSED_ATTRIBUTE)})`
