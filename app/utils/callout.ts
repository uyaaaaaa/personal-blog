// Obsidian の色相を元に、背景上のタイトルが両テーマで 4.5:1 を超える明度にした RGB
export const CALLOUT_COLORS = {
	note: { light: '7, 102, 206', dark: '28, 132, 247' },
	abstract: { light: '0, 117, 115', dark: '0, 191, 188' },
	info: { light: '7, 102, 206', dark: '28, 132, 247' },
	todo: { light: '7, 102, 206', dark: '28, 132, 247' },
	tip: { light: '0, 117, 115', dark: '0, 191, 188' },
	success: { light: '5, 121, 51', dark: '8, 185, 78' },
	question: { light: '165, 82, 0', dark: '236, 117, 0' },
	warning: { light: '165, 82, 0', dark: '236, 117, 0' },
	failure: { light: '202, 22, 43', dark: '235, 76, 95' },
	danger: { light: '202, 22, 43', dark: '235, 76, 95' },
	bug: { light: '202, 22, 43', dark: '235, 76, 95' },
	example: { light: '111, 70, 237', dark: '144, 112, 241' },
	quote: { light: '104, 104, 104', dark: '158, 158, 158' },
} as const

export type CalloutType = keyof typeof CALLOUT_COLORS

// 面は題名の色を 0.1 の不透明度で敷く
export const CALLOUT_SURFACE_ALPHA = 0.1
