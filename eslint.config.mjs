import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import styleTokens, { DOCS_URL, TOKEN_URL } from './eslint-rules/style-tokens.mjs'

const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`

const ARCHITECTURE_URL = `${DOCS_URL}/ARCHITECTURE.md#依存方向`
const AUTO_IMPORT_URL = `${DOCS_URL}/adr/03-no-auto-import.md`

const AREA_DIRECTORY_MESSAGE = `components/ の直下にファイルを置かない。layout / article / content / common / error のいずれかに入れる。 ${ARCHITECTURE_URL}`

const PAGE_CONTEXT_PARAMS_MESSAGE = `components/ は route の値を読まない（.params）。読むのは pages/ 側で、値は props で渡す。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_404_MESSAGE = `components/ は404を送出しない（createError）。判定は pages/ 側で行う。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_META_MESSAGE = `components/ はページのメタを設定しない（useSeoMeta / useHead / definePageMeta / usePageSeo）。設定は pages/ 側で行う。 ${ARCHITECTURE_URL}`

// ディレクトリを跨ぐ参照は `~/`（app/ の外は `~~/`）。相対パスは同じディレクトリの中だけ
const CROSS_DIRECTORY_RELATIVE = ['..', '../*', '../**', './..', './../*', './../**']

const restrictions = {
	'no-restricted-imports': [
		'error',
		{
			paths: [
				{
					name: 'vue',
					message: `Vue の組み込み API は import を書かない。プリセットの auto-import が解決する。プリセットに無い名前（UnwrapRef 等）が要るときだけ eslint-disable を付けて import する。 ${AUTO_IMPORT_URL}`,
				},
				{
					// scan: false のため #imports が出すのはプリセットの名前だけ。全部 auto-import される
					name: '#imports',
					message: `#imports から import を書かない。プリセットの auto-import が解決する。 ${AUTO_IMPORT_URL}`,
				},
			],
			patterns: [
				{
					group: CROSS_DIRECTORY_RELATIVE,
					message: `ディレクトリを跨ぐ参照は ~/ で書く（app/ の外は ~~/）。相対パスは同じディレクトリの中だけ。 ${ARCHITECTURE_URL}`,
				},
				{
					group: ['@/*', '@/**'],
					message: `@/ は使わない。app/ の中は ~/、外は ~~/。 ${ARCHITECTURE_URL}`,
				},
			],
		},
	],
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
		plugins: { vue: pluginVue, style: styleTokens },
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
			// scoped CSS の直値。クラス側の任意値と同じ基準を <style> にも当てる
			'style/no-untokenized-size': 'error',
			'style/no-color-literal': 'error',
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
		// components/ はページの文脈（routeの値・404・ページのメタ）を持たない
		files: ['app/components/**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tsParser,
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			'no-restricted-syntax': [
				'error',
				...restrictions['no-restricted-syntax'].slice(1),
				{
					selector: "MemberExpression[property.name='params']",
					message: PAGE_CONTEXT_PARAMS_MESSAGE,
				},
				{
					selector: "CallExpression[callee.name='createError']",
					message: PAGE_CONTEXT_404_MESSAGE,
				},
				{
					selector:
						'CallExpression[callee.name=/^(useSeoMeta|useHead|definePageMeta|usePageSeo)$/]',
					message: PAGE_CONTEXT_META_MESSAGE,
				},
			],
		},
	},
	{
		// コンポーネントは領域のディレクトリに属する。直下のファイルは Program ごと落とす
		files: ['app/components/*.{vue,ts}'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tsParser,
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'Program',
					message: AREA_DIRECTORY_MESSAGE,
				},
			],
		},
	},
]
