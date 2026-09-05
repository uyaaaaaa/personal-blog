import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

const TOKEN_URL =
	'https://github.com/uyaaaaaa/personal-blog/blob/main/docs/DESIGN_GUIDELINE.md#a-定義場所と単一情報源のルール'
const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`

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
			// 角括弧を含むクラス（`w-[264px]` 等）がTailwindの任意値
			'vue/no-restricted-syntax': [
				'error',
				{
					selector:
						"VAttribute[directive=false][key.name='class'] > VLiteral[value=/\\[/]",
					message: ARBITRARY_VALUE_MESSAGE,
				},
				{
					selector:
						"VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/\\[/], TemplateElement[value.cooked=/\\[/])",
					message: ARBITRARY_VALUE_MESSAGE,
				},
			],
		},
	},
]
