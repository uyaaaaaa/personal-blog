import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import typography from '@tailwindcss/typography'
import {
	colors,
	durations,
	fontFamily,
	fontSize,
	motionProperties,
	proseFontSize,
	screens,
	sizes,
	toCssVariables,
	toDarkCssVariables,
	toTailwindColors,
} from './theme/tokens'
import { TOC_COLLAPSED_ATTRIBUTE } from './app/utils/tocCollapse'

const baseStyles = plugin(({ addBase }) => {
	addBase({
		':root': { ...toCssVariables(), colorScheme: 'light' },
		'.dark': { ...toDarkCssVariables(), colorScheme: 'dark' },
		body: { touchAction: 'manipulation' },
		'@media (prefers-reduced-motion: reduce)': {
			'*, *::before, *::after': {
				transitionDuration: '0s !important',
				transitionDelay: '0s !important',
				animationDuration: '0s !important',
				animationDelay: '0s !important',
			},
		},
	})
})

const motion = plugin(({ addUtilities, theme }) => {
	addUtilities(
		Object.fromEntries(
			Object.entries(motionProperties).map(([purpose, properties]) => [
				`.transition-${purpose}`,
				{
					transitionProperty: properties.join(', '),
					transitionTimingFunction: theme('transitionTimingFunction.DEFAULT'),
					transitionDuration: durations[purpose as keyof typeof durations],
				},
			]),
		),
	)
})

// 明暗はトークンが割り当て直すので、invert にも同じ名前を渡す
const proseColors = Object.fromEntries(
	Object.entries({
		body: 'main',
		headings: 'main',
		lead: 'sub',
		links: 'accent',
		bold: 'main',
		counters: 'sub',
		bullets: 'sub',
		hr: 'border',
		quotes: 'main',
		'quote-borders': 'border',
		captions: 'sub',
		kbd: 'main',
		'kbd-shadows': 'border',
		code: 'main',
		'pre-code': 'code-text',
		'pre-bg': 'surface-subtle',
		'th-borders': 'border',
		'td-borders': 'border',
	} satisfies Record<string, keyof typeof colors>).flatMap(([part, token]) => [
		[`--tw-prose-${part}`, `var(--color-${token})`],
		[`--tw-prose-invert-${part}`, `var(--color-${token})`],
	]),
)

const tocCollapsed = plugin(({ addVariant }) => {
	addVariant('toc-collapsed', `html[${TOC_COLLAPSED_ATTRIBUTE}] &`)
})

export default <Config>{
	content: [
		'./app/components/**/*.{js,vue,ts}',
		'./app/layouts/**/*.vue',
		'./app/pages/**/*.vue',
		'./app/plugins/**/*.{js,ts}',
		'./app/app.vue',
		'./app/error.vue',
	],
	safelist: ['sr-only'],
	darkMode: 'class',
	theme: {
		colors: toTailwindColors(),
		screens,
		fontSize,
		transitionProperty: {},
		transitionDuration: {},
		transitionDelay: {},
		animation: {},
		extend: {
			typography: {
				DEFAULT: {
					css: {
						...proseColors,
						fontSize: `${proseFontSize.base}rem`,
						lineHeight: '1.85',
						h2: { fontSize: '1.44em', lineHeight: '1.4' },
						h3: { fontSize: '1.2em' },
						kbd: {
							boxShadow: 'none',
							border: '1px solid var(--color-border)',
						},
						'code::before': { content: 'none' },
						'code::after': { content: 'none' },
						figure: {
							marginTop: '1.5em',
							marginBottom: '1.5em',
						},
						code: {
							fontSize: '0.875rem',
							backgroundColor: 'var(--color-surface-subtle)',
							border: '1px solid var(--color-border)',
							color: 'inherit',
							fontWeight: '400',
							borderRadius: '0.25rem',
							paddingTop: '0.125rem',
							paddingBottom: '0.125rem',
							paddingLeft: '0.375rem',
							paddingRight: '0.375rem',
						},
					},
				},
				wide: {
					css: {
						fontSize: `${proseFontSize.wide}rem`,
						lineHeight: '1.9',
						code: { fontSize: '1rem' },
					},
				},
			},
			fontFamily,
			...sizes,
		},
	},
	plugins: [typography, baseStyles, motion, tocCollapsed],
}
