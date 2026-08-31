import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const codeBg = '#F5F5F5'

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
      colors: {
        base: '#FAF5FF',
        main: '#1A1A1A',
        sub: '#888888',
        accent: '#8B5CF6',
        border: '#E5E5E5',
        'code-bg': codeBg
      },
      typography: {
        DEFAULT: {
          css: {
            // インラインコード: バッククォート非表示 + Obsidian風のグレー背景（#6）
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            // コードブロック: github-lightテーマに合わせたライト背景（#8）
            pre: {
              backgroundColor: codeBg,
              color: '#24292E',
              border: '1px solid #E5E5E5',
            },
            code: {
              backgroundColor: codeBg,
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
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      }
    }
  },
  plugins: [
    typography,
  ],
}
