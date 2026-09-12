import typography from '@tailwindcss/typography'
import resolveConfig from 'tailwindcss/resolveConfig'
import { describe, expect, it } from 'vitest'
import config from '~~/tailwind.config'

const base = resolveConfig({ content: [], plugins: [typography] }).theme as unknown as {
	typography: Record<string, unknown>
}

describe('typography', () => {
	it('プラグインが既定で持つ段の名前を上書きしない', () => {
		const shadowed = Object.keys(config.theme?.extend?.typography ?? {}).filter(
			(modifier) => modifier !== 'DEFAULT' && modifier in base.typography,
		)

		expect(shadowed).toEqual([])
	})
})
