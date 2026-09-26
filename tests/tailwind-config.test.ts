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
	it('本文の体裁が上書きする文字サイズを px で書かない', () => {
		const px: string[] = []
		const walk = (css: unknown) => {
			for (const [key, value] of Object.entries(css as Record<string, unknown>)) {
				if (typeof value === 'object' && value !== null) walk(value)
				else if (key === 'fontSize' && String(value).endsWith('px')) px.push(String(value))
			}
		}
		walk(config.theme?.extend?.typography)

		expect(px).toEqual([])
	})

	it('プラグインが既定で持つ段の名前を上書きしない', () => {
		const shadowed = Object.keys(config.theme?.extend?.typography ?? {}).filter(
			(modifier) => modifier !== 'DEFAULT' && modifier in base.typography,
		)

		expect(shadowed).toEqual([])
	})
})

const utilities = async (raw: string) => {
	const { css } = await postcss([
		tailwind({ ...config, content: [{ raw, extension: 'html' }] }),
	]).process('@tailwind utilities', { from: undefined })
	return css
}

const baseStyles = async () => {
	const { css } = await postcss([
		tailwind({ ...config, content: [{ raw: '', extension: 'html' }] }),
	]).process('@tailwind base', { from: undefined })
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
			'<p class="duration-200 delay-150 animate-spin transition transition-colors transition-all transition-transform"></p>',
		)

		expect(css).not.toMatch(
			/duration-200|delay-150|animate-spin|transition-(colors|all|transform)|\.transition[\s{]/,
		)
	})
})

const reducedMotionRules = (css: string) => {
	const found: { selector: string; declarations: string[] }[] = []
	postcss.parse(css).walkAtRules('media', (atRule) => {
		if (!atRule.params.includes('prefers-reduced-motion: reduce')) return

		atRule.walkRules((rule) => {
			found.push({
				selector: rule.selector,
				declarations: rule.nodes
					.filter((node) => node.type === 'decl')
					.map(
						(decl) =>
							`${decl.prop}: ${decl.value}${decl.important ? ' !important' : ''}`,
					),
			})
		})
	})
	return found
}

describe('ルートの文字サイズ', () => {
	it('利用者の既定の文字サイズを上書きしない', async () => {
		const declared: string[] = []
		postcss.parse(await baseStyles()).walkRules(/^(?::root|html)$/, (rule) =>
			rule.walkDecls('font-size', (decl) => {
				declared.push(decl.value)
			}),
		)

		expect(declared).toEqual([])
	})
})

describe('動きを減らす設定', () => {
	it('どこが宣言したモーションも長さを失う', async () => {
		expect(reducedMotionRules(await baseStyles())).toEqual([
			{
				selector: '*, *::before, *::after',
				declarations: [
					'transition-duration: 0s !important',
					'animation-duration: 0s !important',
				],
			},
		])
	})
})
