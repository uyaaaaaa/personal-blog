import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

const DOCS_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs'
const TOKEN_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#a-定義場所と単一情報源のルール`
const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`

const IMPORT_URL = `${DOCS_URL}/ARCHITECTURE.md#依存方向`
const PLATFORM_URL = `${DOCS_URL}/ARCHITECTURE.md#強制手段の現状`

// ディレクトリを跨ぐ参照は `~/`（app/ の外は `~~/`）。相対パスは同じディレクトリの中だけ
const CROSS_DIRECTORY_RELATIVE = ['..', '../*', '../**', './..', './../*', './../**']

const restrictions = {
	'no-restricted-imports': [
		'error',
		{
			patterns: [
				{
					group: CROSS_DIRECTORY_RELATIVE,
					message: `ディレクトリを跨ぐ参照は ~/ で書く（app/ の外は ~~/）。相対パスは同じディレクトリの中だけ。 ${IMPORT_URL}`,
				},
				{
					group: ['@/*', '@/**'],
					message: `@/ は使わない。app/ の中は ~/、外は ~~/。 ${IMPORT_URL}`,
				},
			],
		},
	],
	'no-restricted-syntax': [
		'error',
		{
			// window.navigator.userAgent と navigator['userAgent'] も落とす
			selector: "MemberExpression[property.name='userAgent']",
			message: `navigator.userAgent で分岐しない。機能の有無か、CSS のメディア特性で判定する。 ${PLATFORM_URL}`,
		},
		{
			selector: "MemberExpression[computed=true] > Literal[value='userAgent']",
			message: `navigator.userAgent で分岐しない。機能の有無か、CSS のメディア特性で判定する。 ${PLATFORM_URL}`,
		},
		{
			// bfcache を壊すため、離脱時の処理は pagehide / visibilitychange に置く
			selector:
				'CallExpression[callee.property.name=/^(add|remove)EventListener$/] > Literal[value=/^(before)?unload$/]',
			message: `unload / beforeunload は購読しない。離脱時の処理は pagehide か visibilitychange に置く。 ${PLATFORM_URL}`,
		},
		{
			selector: 'MemberExpression[property.name=/^on(before)?unload$/]',
			message: `onunload / onbeforeunload は使わない。離脱時の処理は pagehide か visibilitychange に置く。 ${PLATFORM_URL}`,
		},
	],
}

export default [
	{
		ignores: ['.nuxt/**', '.output/**', 'dist/**', 'node_modules/**'],
	},
	{
		files: ['app/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: { ...restrictions },
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
			...restrictions,
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
