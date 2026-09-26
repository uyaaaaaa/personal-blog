export const colors = {
	bg: '#FAFAF8',
	main: '#1A1A1A',
	sub: '#5F5F5C',
	accent: '#7C3AED',
	'accent-hover': '#6D28D9',
	'accent-contrast': '#FFFFFF',
	border: '#E6E4DF',
	'border-strong': '#1A1A1A',
	'border-field': '#8A8883',
	surface: '#FFFFFF',
	'surface-subtle': '#F3F2EE',
	'surface-muted': '#ECEAE4',
	'header-bg': 'rgba(250, 250, 248, 0.9)',
	overlay: 'rgba(0, 0, 0, 0.5)',
	scrollbar: '#D1D0CC',
	'code-text': '#24292E',
	// github-lightがdiffのトークンに持つ背景色
	'diff-add-bg': '#F0FFF4',
	'diff-remove-bg': '#FFEEF0',
	// GitHubのdiff表示で変化した語に敷く背景色
	'diff-add-word-bg': '#ABF2BC',
	'diff-remove-word-bg': '#FFC1C2',
} as const

export const darkColors: Record<keyof typeof colors, string> = {
	bg: '#141414',
	main: '#D4D4D0',
	sub: '#8A8A86',
	accent: '#A78BFA',
	'accent-hover': '#C4B5FD',
	'accent-contrast': '#141414',
	border: '#2E2E2E',
	'border-strong': '#8A8A86',
	'border-field': '#6E6E6A',
	surface: '#1A1A1A',
	'surface-subtle': '#1E1E1E',
	'surface-muted': '#262626',
	'header-bg': 'rgba(20, 20, 20, 0.85)',
	overlay: 'rgba(0, 0, 0, 0.5)',
	scrollbar: '#3A3A3A',
	'code-text': '#E1E4E8',
	// GitHubのdiff表示の行背景（github-darkのトークン背景は帯が強すぎる）
	'diff-add-bg': 'rgba(46, 160, 67, 0.15)',
	'diff-remove-bg': 'rgba(248, 81, 73, 0.15)',
	'diff-add-word-bg': 'rgba(46, 160, 67, 0.4)',
	'diff-remove-word-bg': 'rgba(248, 81, 73, 0.4)',
}

// Tailwind の既定の md / lg と同じ値。既定を閉じるのが目的で、境界そのものは動かさない
export const screens = {
	md: '768px',
	lg: '1024px',
}

export const fontFamily = {
	sans: [
		'system-ui',
		'-apple-system',
		'BlinkMacSystemFont',
		'"Segoe UI"',
		'Roboto',
		'"Helvetica Neue"',
		'Arial',
		'sans-serif',
	],
	mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
}

// Tailwind の既定の xs / sm / base / xl と同じ値。既定を閉じるためだけに持つ
export const fontSize = {
	'2xs': '0.75rem',
	meta: ['0.75rem', '1rem'],
	code: ['0.875rem', '1.7'],
	ui: ['0.875rem', '1.25rem'],
	'list-title': ['1rem', '1.4'],
	total: ['1rem', '1.5rem'],
	logo: '1.125rem',
	'notice-title': ['1.25rem', '1.75rem'],
	'title-sm': ['1.5rem', '1.35'],
	heading: ['1.5rem', '1.3'],
	'hero-sm': ['1.625rem', '1.3'],
	title: ['2rem', '1.35'],
	hero: ['2.375rem', '1.25'],
} as Record<string, string | [string, string]>

export const durations = {
	color: '0.15s',
	move: '0.2s',
} as const

// color は Tailwind の transition-colors と同じ並び
export const motionProperties: Record<keyof typeof durations, string[]> = {
	color: ['color', 'background-color', 'border-color', 'text-decoration-color', 'fill', 'stroke'],
	move: ['transform', 'opacity', 'visibility', 'grid-template-rows'],
}

// 現れるものは減速し、消えるものは加速する。CSS は行き先の状態の transition を使うので、開いた側に enter、閉じた側に exit を書く
export const easings = {
	enter: 'cubic-bezier(0, 0, 0.2, 1)',
	exit: 'cubic-bezier(0.4, 0, 1, 1)',
	change: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

const HEADER_SM = '52px'
const HEADER = '60px'

const TOC_TOP = '100px'

// 吸着した帯（ヘッダー + 見出しの行）の下に残る高さ。畳んだ帯の下端は md で 103px
const TOC_PANEL_TOP = '140px'

// 本文の文字サイズ（rem）。和文は1字が1em なので、字数を掛ければ行長になる
export const proseFontSize = { base: 1, wide: 1.125 }
const PROSE_CHARS = 40
const COLUMN = `${PROSE_CHARS * proseFontSize.base}rem`
const COLUMN_WIDE = `${PROSE_CHARS * proseFontSize.wide}rem`
const TOC_GAP = 3.5
const TOC_WIDTH = 14

export const sizes = {
	borderRadius: {
		kbd: '3px',
		card: '10px',
	},
	gridTemplateColumns: {
		article: `minmax(0, ${COLUMN_WIDE}) ${TOC_WIDTH}rem`,
		list: '2.25rem 1fr 6.875rem',
		'list-sm': '1.875rem 1fr',
		pickup: '6rem 1fr',
	},
	height: {
		'header-sm': HEADER_SM,
		header: HEADER,
	},
	letterSpacing: {
		marker: '0.12em',
	},
	maxHeight: {
		'sticky-column': `calc(100vh - ${TOC_TOP})`,
		'toc-panel': `calc(100dvh - ${TOC_PANEL_TOP})`,
	},
	maxWidth: {
		'search-trigger': '200px',
		'search-open': '640px',
		column: COLUMN,
		'column-wide': COLUMN_WIDE,
		article: `${PROSE_CHARS * proseFontSize.wide + TOC_GAP + TOC_WIDTH}rem`,
		container: '1200px',
	},
	spacing: {
		'icon-small': '1rem',
		icon: '1.125rem',
		'icon-large': '1.25rem',
		'logo-mark': '26px',
		'landing-offset-sm': '116px',
		'landing-offset': '124px',
		'landing-offset-lg': '92px',
		'below-header-sm': HEADER_SM,
		'below-header': HEADER,
		'toc-top': TOC_TOP,
		'toc-gap': `${TOC_GAP}rem`,
		'menu-panel': '960px',
	},
}

const isHex = (value: string) => value.startsWith('#')

function hexToRgbChannels(hex: string): string {
	return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')
}

function toColorVariables(palette: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(palette).flatMap(([name, value]) => [
			[`--color-${name}`, value],
			...(isHex(value) ? [[`--color-${name}-rgb`, hexToRgbChannels(value)]] : []),
		]),
	)
}

export function toCssVariables(): Record<string, string> {
	return {
		...toColorVariables(colors),
		...Object.fromEntries(
			Object.entries(fontFamily).map(([name, stack]) => [`--font-${name}`, stack.join(', ')]),
		),
		...Object.fromEntries(
			Object.entries(easings).map(([name, value]) => [`--ease-${name}`, value]),
		),
	}
}

export function toDarkCssVariables(): Record<string, string> {
	return toColorVariables(darkColors)
}

// Tailwindが不透明度修飾子(bg-accent/10 等)を解決できるのは<alpha-value>プレースホルダを含む定義のみ
export function toTailwindColors(): Record<string, string> {
	return {
		// 既定のパレットごと置き換えるので、トークンの外にあるこの2つもここが配る
		transparent: 'transparent',
		current: 'currentColor',
		...Object.fromEntries(
			Object.entries(colors).map(([name, value]) => [
				name,
				isHex(value)
					? `rgb(var(--color-${name}-rgb) / <alpha-value>)`
					: `var(--color-${name})`,
			]),
		),
	}
}
