import resolveConfig from 'tailwindcss/resolveConfig'
import { describe, expect, it } from 'vitest'
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

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi! + 0.05) / (lo! + 0.05)
}

describe.each([
	['light', colors],
	['dark', darkColors],
])('%s の border-field', (_, palette) => {
	it.each(['bg', 'surface', 'surface-subtle'] as const)('%s に対し 3:1 以上', (background) => {
		expect(contrast(palette['border-field'], palette[background])).toBeGreaterThanOrEqual(3)
	})
})
