import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

const DOCS_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs'
const TOKEN_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#a-定義場所と単一情報源のルール`
const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`

const IMPORT_URL = `${DOCS_URL}/ARCHITECTURE.md#依存方向`
const AUTO_IMPORT_URL = `${DOCS_URL}/adr/03-no-auto-import.md`

// ディレクトリを跨ぐ参照は `~/`（app/ の外は `~~/`）。相対パスは同じディレクトリの中だけ
const CROSS_DIRECTORY_RELATIVE = ['..', '../*', '../**', './..', './../*', './../**']

const IMPORT_PATTERNS = [
	{
		group: CROSS_DIRECTORY_RELATIVE,
		message: `ディレクトリを跨ぐ参照は ~/ で書く（app/ の外は ~~/）。相対パスは同じディレクトリの中だけ。 ${IMPORT_URL}`,
	},
	{
		group: ['@/*', '@/**'],
		message: `@/ は使わない。app/ の中は ~/、外は ~~/。 ${IMPORT_URL}`,
	},
]

const restrictions = {
	'no-restricted-imports': ['error', { patterns: IMPORT_PATTERNS }],
	'no-restricted-syntax': [
		'error',
		{
			// window.navigator.userAgent と navigator['userAgent'] も落とす
			selector: "MemberExpression[property.name='userAgent']",
			message:
				'navigator.userAgent で分岐しない。機能の有無か、CSS のメディア特性で判定する。',
		},
		{
			selector: "MemberExpression[computed=true] > Literal[value='userAgent']",
			message:
				'navigator.userAgent で分岐しない。機能の有無か、CSS のメディア特性で判定する。',
		},
		{
			// bfcache を壊すため、離脱時の処理は pagehide / visibilitychange に置く
			selector:
				'CallExpression[callee.property.name=/^(add|remove)EventListener$/] > Literal[value=/^(before)?unload$/]',
			message:
				'unload / beforeunload は購読しない。離脱時の処理は pagehide か visibilitychange に置く。',
		},
		{
			selector: 'MemberExpression[property.name=/^on(before)?unload$/]',
			message:
				'onunload / onbeforeunload は使わない。離脱時の処理は pagehide か visibilitychange に置く。',
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
	{
		// テストは Nuxt の外（happy-dom / node）で走り auto-import が効かないため、対象から外す
		files: ['app/**/*.ts', 'app/**/*.vue'],
		ignores: ['app/**/*.test.ts', 'app/**/*.test-helper.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'vue',
							message: `Vue の組み込み API は import を書かない。プリセットの auto-import が解決する。 ${AUTO_IMPORT_URL}`,
						},
					],
					patterns: IMPORT_PATTERNS,
				},
			],
		},
	},
]
