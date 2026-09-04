import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
  {
    ignores: ['.nuxt/**', '.output/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['app/**/*.vue'],
    plugins: { vue: pluginVue },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // components: false 後もグローバル登録が残るのはNuxtの組み込みコンポーネントのみ
      'vue/no-undef-components': [
        'error',
        {
          ignorePatterns: ['Nuxt[A-Z]\\w*', 'ContentRenderer'],
        },
      ],
    },
  },
]
