import typography from '@tailwindcss/typography'
import postcss from 'postcss'
import tailwind from 'tailwindcss'
import resolveConfig from 'tailwindcss/resolveConfig'
import { describe, expect, it } from 'vitest'
import config from '~~/tailwind.config'
import { durations, easings, sizes } from '~~/theme/tokens'

const base = resolveConfig({ content: [], plugins: [typography] }).theme as unknown as {
	typography: Record<string, unknown>
}

describe('typography', () => {
	it('本文の体裁が上書きする文字サイズを、倍率の em か 0.125rem 刻みの rem で書く', () => {
		const onScale = (size: string) =>
			size.endsWith('rem') ? Number.isInteger(parseFloat(size) * 8) : size.endsWith('em')
		const offScale: string[] = []
		const walk = (css: unknown) => {
			for (const [key, value] of Object.entries(css as Record<string, unknown>)) {
				if (typeof value === 'object' && value !== null) walk(value)
				else if (key === 'fontSize' && !onScale(String(value))) offScale.push(String(value))
			}
		}
		walk(config.theme?.extend?.typography)

		expect(offScale).toEqual([])
	})

	it('本文を収める列の幅が、その段の本文の文字サイズで和文 40 字になる', () => {
		const prose = config.theme?.extend?.typography as Record<
			string,
			{ css: { fontSize: string } }
		>
		const chars = (width: string, modifier: string) =>
			parseFloat(width) / parseFloat(prose[modifier]!.css.fontSize)
		const bodyColumn = sizes.gridTemplateColumns.article.match(/minmax\(0, ([\d.]+rem)\)/)![1]!

		expect([
			chars(sizes.maxWidth.column, 'DEFAULT'),
			chars(sizes.maxWidth['column-wide'], 'wide'),
			chars(bodyColumn, 'wide'),
		]).toEqual([40, 40, 40])
	})

	it('プラグインが既定で持つ段の名前を上書きしない', () => {
		const shadowed = Object.keys(config.theme?.extend?.typography ?? {}).filter(
			(modifier) => modifier !== 'DEFAULT' && modifier in base.typography,
		)

		expect(shadowed).toEqual([])
	})

	it('本文の色の変数がすべてトークンを指す', async () => {
		const { css } = await postcss([
			tailwind({
				...config,
				content: [{ raw: '<div class="prose"></div>', extension: 'html' }],
			}),
		]).process('@tailwind components', { from: undefined })
		const outside: string[] = []
		postcss.parse(css).walkDecls(/^--tw-prose-/, (decl) => {
			if (!/^var\(--color-[a-z-]+\)$/.test(decl.value))
				outside.push(`${decl.prop}: ${decl.value}`)
		})

		expect(outside).toEqual([])
	})
})

const utilities = async (raw: string) => {
	const { css } = await postcss([
		tailwind({ ...config, content: [{ raw, extension: 'html' }] }),
	]).process('@tailwind utilities', { from: undefined })
	return css
}

const baseStyles = async (raw = '') => {
	const { css } = await postcss([
		tailwind({ ...config, content: [{ raw, extension: 'html' }] }),
	]).process('@tailwind base', { from: undefined })
	return css
}

const declarationOf = (css: string, selector: string, property: string) => {
	let found: string | undefined
	postcss.parse(css).walkRules(selector, (rule) =>
		rule.walkDecls(property, (decl) => {
			found = decl.value
		}),
	)
	return found
}

describe('モーションのクラス', () => {
	it('用途のクラスがその用途の長さを持つ', async () => {
		const css = await utilities('<p class="transition-color md:transition-move"></p>')

		expect(declarationOf(css, '.transition-color', 'transition-duration')).toBe(durations.color)
		expect(declarationOf(css, '.md\\:transition-move', 'transition-duration')).toBe(
			durations.move,
		)
	})

	it('用途のクラスがその場で変わるものの緩急を持つ', async () => {
		const css = await utilities('<p class="transition-color md:transition-move"></p>')
		const root = await baseStyles()

		expect(declarationOf(css, '.transition-color', 'transition-timing-function')).toBe(
			'var(--ease-change)',
		)
		expect(declarationOf(root, ':root', '--ease-change')).toBe(easings.change)
	})

	it('緩急を別に書くクラスを出さない', async () => {
		const css = await utilities('<p class="ease-in ease-out ease-in-out ease-linear"></p>')

		expect(css).not.toMatch(/ease-(in|out|linear)/)
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
					'transition-delay: 0s !important',
					'animation-duration: 0s !important',
					'animation-delay: 0s !important',
				],
			},
		])
	})
})

const colorSchemeOf = (css: string, selector: string) => {
	let found: string | undefined
	postcss.parse(css).walkRules(selector, (rule) =>
		rule.walkDecls('color-scheme', (decl) => {
			found = decl.value
		}),
	)
	return found
}

describe('明暗の宣言', () => {
	it('フォーム部品とスクロールバーの配色が明暗の切り替えに付いてくる', async () => {
		// .dark の規則は、その class が content に無いと Tailwind が出さない
		const css = await baseStyles('<html class="dark"></html>')

		expect(colorSchemeOf(css, ':root')).toBe('light')
		expect(colorSchemeOf(css, '.dark')).toBe('dark')
	})
})
