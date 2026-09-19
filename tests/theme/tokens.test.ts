import resolveConfig from 'tailwindcss/resolveConfig'
import { describe, expect, it } from 'vitest'
import { sizes } from '~~/theme/tokens'

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
})
