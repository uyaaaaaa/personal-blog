import typography from '@tailwindcss/typography'
import postcss from 'postcss'
import tailwind from 'tailwindcss'
import resolveConfig from 'tailwindcss/resolveConfig'
import { describe, expect, it } from 'vitest'
import config from '~~/tailwind.config'
import { durations } from '~~/theme/tokens'

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

// 長さを持つのは用途のクラス。生成した CSS で確かめる
const utilities = async (raw: string) => {
	const { css } = await postcss([
		tailwind({ ...config, content: [{ raw, extension: 'html' }] }),
	]).process('@tailwind utilities', { from: undefined })
	return css
}

const durationOf = (css: string, selector: string) => {
	let found: string | undefined
	postcss.parse(css).walkRules(selector, (rule) =>
		rule.walkDecls('transition-duration', (decl) => {
			found = decl.value
		}),
	)
	return found
}

describe('モーションのクラス', () => {
	it('用途のクラスがその用途の長さを持つ', async () => {
		const css = await utilities('<p class="transition-color md:transition-move"></p>')

		expect(durationOf(css, '.transition-color')).toBe(durations.color)
		expect(durationOf(css, '.md\\:transition-move')).toBe(durations.move)
	})

	it('長さを別に書くクラスを出さない', async () => {
		const css = await utilities(
			'<p class="duration-200 delay-150 animate-spin transition-colors transition-all"></p>',
		)

		expect(css).not.toMatch(
			/duration-200|delay-150|animate-spin|transition-colors|transition-all/,
		)
	})
})
