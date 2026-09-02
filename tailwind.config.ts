import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import typography from '@tailwindcss/typography'
import { fontFamily, toCssVariables, toDarkCssVariables, toTailwindColors } from './theme/tokens'

const baseStyles = plugin(({ addBase }) => {
  addBase({
    ':root': toCssVariables(),
    '.dark': toDarkCssVariables(),
    // ダブルタップズームとタップ遅延を無効にする。ピンチズームは残る
    body: { touchAction: 'manipulation' },
  })
})

export default <Config>{
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue'
  ],
  // remark-gfmが脚注セクションの見出しに付ける。ソースに現れないためパージされる
  safelist: ['sr-only'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: toTailwindColors(),
      typography: {
        DEFAULT: {
          css: {
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            pre: {
              backgroundColor: 'var(--color-surface-subtle)',
              color: 'var(--color-code-text)',
              border: '1px solid var(--color-border)',
            },
            code: {
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
      },
      fontFamily,
    }
  },
  plugins: [
    typography,
    baseStyles,
  ],
}
