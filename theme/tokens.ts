export const colors = {
	bg: '#FAFAF8',
	main: '#1A1A1A',
	sub: '#5F5F5C',
	accent: '#7C3AED',
	'accent-hover': '#6D28D9',
	'accent-contrast': '#FFFFFF',
	border: '#E6E4DF',
	'border-strong': '#1A1A1A',
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
	surface: '#1A1A1A',
	'surface-subtle': '#1E1E1E',
	'surface-muted': '#262626',
	'header-bg': 'rgba(20, 20, 20, 0.85)',
	overlay: 'rgba(0, 0, 0, 0.5)',
	scrollbar: '#3A3A3A',
	// github-darkの前景色。ProsePreがdiffのマーカーと語にこれを当てるので、隣のトークンと同じ灰にする
	'code-text': '#E1E4E8',
	// GitHubのdiff表示の行背景（github-darkのトークン背景は帯が強すぎる）
	'diff-add-bg': 'rgba(46, 160, 67, 0.15)',
	'diff-remove-bg': 'rgba(248, 81, 73, 0.15)',
	'diff-add-word-bg': 'rgba(46, 160, 67, 0.4)',
	'diff-remove-word-bg': 'rgba(248, 81, 73, 0.4)',
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
} as const

export const sizes = {
	borderRadius: {
		card: '10px',
	},
	fontSize: {
		emoji: '28px',
	},
	maxHeight: {
		'sticky-column': 'calc(100vh - 6rem)',
		'toc-dropdown': '60vh',
	},
	maxWidth: {
		container: '1200px',
	},
	minHeight: {
		'card-title': '2.6em',
	},
	spacing: {
		'toc-guide': '3px',
		'below-header': '74px',
		'landing-offset': '88px',
		'landing-offset-lg': '96px',
		'toc-hidden': '120px',
		'hero-media': '230px',
		'shelf-card': '264px',
		sidebar: '300px',
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
	}
}

export function toDarkCssVariables(): Record<string, string> {
	return toColorVariables(darkColors)
}

// Tailwindが不透明度修飾子(bg-accent/10 等)を解決できるのは<alpha-value>プレースホルダを含む定義のみ
export function toTailwindColors(): Record<string, string> {
	return Object.fromEntries(
		Object.entries(colors).map(([name, value]) => [
			name,
			isHex(value) ? `rgb(var(--color-${name}-rgb) / <alpha-value>)` : `var(--color-${name})`,
		]),
	)
}
