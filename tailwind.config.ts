import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import typography from '@tailwindcss/typography'
import { colors, fontFamily, toCssVariables } from './theme/tokens'

const cssVariables = plugin(({ addBase }) => {
  addBase({ ':root': toCssVariables() })
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
  theme: {
    extend: {
      colors,
      typography: {
        DEFAULT: {
          css: {
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            pre: {
              backgroundColor: colors['surface-subtle'],
              color: '#24292E',
              border: `1px solid ${colors.border}`,
            },
            code: {
              backgroundColor: colors['surface-subtle'],
              border: `1px solid ${colors.border}`,
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
    cssVariables,
  ],
}
