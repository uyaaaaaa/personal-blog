const isInsideLink = (target: EventTarget | null): boolean =>
	target instanceof Element && target.closest('a') !== null

export const shouldJumpToHeading = (event: MouseEvent, selection: Selection | null): boolean =>
	!isInsideLink(event.target) && (selection === null || selection.isCollapsed)

// remark-gfm は脚注の見出しを sr-only で置く
export const isScreenReaderOnly = (className: unknown): boolean =>
	String(className ?? '')
		.split(/\s+/)
		.includes('sr-only')
