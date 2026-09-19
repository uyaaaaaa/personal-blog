const isInsideLink = (target: EventTarget | null): boolean =>
	target instanceof Element && target.closest('a') !== null

// 見出しの中のリンク（節のアイコン、本文中のリンク）は自前の遷移を持つ。
// 文字を選んだ直後の click は選択の終わりなので、移動に使わない
export const shouldJumpToHeading = (event: MouseEvent, selection: Selection | null): boolean =>
	!isInsideLink(event.target) && (selection === null || selection.isCollapsed)

// remark-gfm は脚注の見出しを sr-only で置く。画面に出ない見出しなので、押す的も Tab の行き先も作らない
export const isScreenReaderOnly = (className: unknown): boolean =>
	String(className ?? '')
		.split(/\s+/)
		.includes('sr-only')
