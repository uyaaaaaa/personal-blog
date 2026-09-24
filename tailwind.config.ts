import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import typography from '@tailwindcss/typography'
import {
	durations,
	fontFamily,
	fontSize,
	motionProperties,
	screens,
	sizes,
	toCssVariables,
	toDarkCssVariables,
	toTailwindColors,
} from './theme/tokens'
import { TOC_COLLAPSED_ATTRIBUTE } from './app/utils/tocCollapse'

const baseStyles = plugin(({ addBase }) => {
	addBase({
		':root': toCssVariables(),
		'.dark': toDarkCssVariables(),
		body: { touchAction: 'manipulation' },
		'@media (prefers-reduced-motion: reduce)': {
			'*, *::before, *::after': {
				transitionDuration: '0s !important',
				animationDuration: '0s !important',
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
						fontSize: '15.5px',
						lineHeight: '1.85',
						h2: { fontSize: '1.44em', lineHeight: '1.4' },
						h3: { fontSize: '1.2em' },
						'code::before': { content: 'none' },
						'code::after': { content: 'none' },
						figure: {
							marginTop: '1.5em',
							marginBottom: '1.5em',
						},
						code: {
							fontSize: '13.5px',
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
						fontSize: '17px',
						lineHeight: '1.9',
						code: { fontSize: '15px' },
					},
				},
			},
			fontFamily,
			...sizes,
		},
	},
	plugins: [typography, baseStyles, motion, tocCollapsed],
}
