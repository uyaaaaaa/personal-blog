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

const baseStyles = plugin(({ addBase }) => {
	addBase({
		':root': toCssVariables(),
		'.dark': toDarkCssVariables(),
		// ダブルタップズームとタップ遅延を無効にする。ピンチズームは残る
		body: { touchAction: 'manipulation' },
	})
})

// 用途ごとに1つのクラスにする。対象のプロパティと長さが離れると、同じ用途に別の長さが付く
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

export default <Config>{
	content: [
		'./app/components/**/*.{js,vue,ts}',
		'./app/layouts/**/*.vue',
		'./app/pages/**/*.vue',
		'./app/plugins/**/*.{js,ts}',
		'./app/app.vue',
		'./app/error.vue',
	],
	// remark-gfmが脚注セクションの見出しに付ける。ソースに現れないためパージされる
	safelist: ['sr-only'],
	darkMode: 'class',
	theme: {
		// extend の下だと Tailwind の既定が残り、トークンに無い名前
		// （bg-red-500 / sm: / text-lg）が書ける。ここに置くと既定ごと置き換わる
		colors: toTailwindColors(),
		screens,
		fontSize,
		// 長さを別に書くクラス（duration- / delay- / animate-）と、用途の決まらない transition-*
		// を消す。モーションのクラスは motion が用途ごとに1つずつ持つ
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
	plugins: [typography, baseStyles, motion],
}
