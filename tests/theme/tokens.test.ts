import resolveConfig from 'tailwindcss/resolveConfig'
import { describe, expect, it } from 'vitest'
import { CALLOUT_COLORS, CALLOUT_SURFACE_ALPHA } from '~/utils/callout'
import { colors, darkColors, sizes } from '~~/theme/tokens'

const base = resolveConfig({ content: [] }).theme as unknown as Record<
	string,
	Record<string, unknown>
>

describe('sizes', () => {
	it('Tailwind が既定で持つ名前を上書きしない', () => {
		const shadowed = Object.entries(sizes).flatMap(([section, names]) =>
			Object.keys(names)
				.filter((name) => name in (base[section] ?? {}))
				.map((name) => `${section}.${name}`),
		)

		expect(shadowed).toEqual([])
	})

	it('検索を開いたとき、候補を横に走査できる幅を持つ', () => {
		expect(sizes.maxWidth['search-open']).toBe('640px')
	})
})

function channels(color: string): [number, number, number, number] {
	if (color.startsWith('#')) {
		const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
		return [r!, g!, b!, 1]
	}
	const [r, g, b, a] = color.match(/[\d.]+/g)!.map(Number)
	return [r!, g!, b!, a!]
}

function flatten(layers: string[]): [number, number, number] {
	return layers.reduce<[number, number, number]>(
		(under, layer) => {
			const [r, g, b, a] = channels(layer)
			return [r, g, b].map((c, i) => c * a + under[i]! * (1 - a)) as [number, number, number]
		},
		[0, 0, 0],
	)
}

function luminance(layers: string[]): number {
	const [r, g, b] = flatten(layers)
		.map((c) => c / 255)
		.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(foreground: string, background: string[]): number {
	const [hi, lo] = [luminance([...background, foreground]), luminance(background)].sort(
		(x, y) => y - x,
	)
	return (hi! + 0.05) / (lo! + 0.05)
}

type Token = keyof typeof colors

const pageBackgrounds: Token[][] = [['bg'], ['bg', 'header-bg'], ['surface'], ['surface-subtle']]

const codeBackgrounds: Token[][] = [
	['surface-subtle'],
	['surface-subtle', 'diff-add-bg'],
	['surface-subtle', 'diff-remove-bg'],
	['surface-subtle', 'diff-add-bg', 'diff-add-word-bg'],
	['surface-subtle', 'diff-remove-bg', 'diff-remove-word-bg'],
]

const pairs: [Token, Token[][], number][] = [
	['main', pageBackgrounds, 4.5],
	['sub', pageBackgrounds, 4.5],
	['accent', pageBackgrounds, 4.5],
	['accent-hover', pageBackgrounds, 4.5],
	['code-text', codeBackgrounds, 4.5],
	['accent-contrast', [['accent'], ['accent-hover']], 4.5],
	['border-field', pageBackgrounds, 3],
]

describe.each([
	['light', colors],
	['dark', darkColors],
])('%s のコントラスト', (_, palette) => {
	it.each(
		pairs.flatMap(([foreground, backgrounds, min]) =>
			backgrounds.map((layers) => [foreground, layers.join(' + '), min, layers] as const),
		),
	)('%s は %s に対し %s:1 以上', (foreground, _name, min, layers) => {
		expect(
			contrast(
				palette[foreground],
				layers.map((token) => palette[token]),
			),
		).toBeGreaterThanOrEqual(min)
	})
})

describe.each([
	['light', colors, 'light'],
	['dark', darkColors, 'dark'],
] as const)('%s の Callout', (_, palette, theme) => {
	it.each(Object.entries(CALLOUT_COLORS))('%s の題名は面に対し 4.5:1 以上', (_type, rgb) => {
		expect(
			contrast(`rgba(${rgb[theme]}, 1)`, [
				palette.bg,
				`rgba(${rgb[theme]}, ${CALLOUT_SURFACE_ALPHA})`,
			]),
		).toBeGreaterThanOrEqual(4.5)
	})
})
