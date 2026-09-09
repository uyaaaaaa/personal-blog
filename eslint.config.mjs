import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import importLayers from './eslint-rules/import-layers.mjs'
import styleTokens, { DOCS_URL, MOTION_URL, TOKEN_URL } from './eslint-rules/style-tokens.mjs'

const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`
const PALETTE_MESSAGE = `Tailwind 既定のパレット（text-red-500 等）は使わない。色は theme/tokens.ts のトークンの名前で書く。 ${TOKEN_URL}`

const ARCHITECTURE_URL = `${DOCS_URL}/ARCHITECTURE.md#層と依存方向`
const AUTO_IMPORT_URL = `${DOCS_URL}/adr/03-no-auto-import.md`

const REDUCED_MOTION_MESSAGE = `prefers-reduced-motion で分岐しない。モーションの長さは用途ごとに1つ決める。 ${MOTION_URL}`
const BARREL_MESSAGE = `再エクスポートだけのファイル（barrel file）を作らない。実体のファイルを直接 import する。 ${ARCHITECTURE_URL}`
const IMPORTANT_MESSAGE =
	'!important は書かない。Tailwind の ! 修飾子と style 属性も同じ。第三者由来のインラインスタイルを打ち消すときだけ、理由を添えた eslint-disable で許す。'

const PALETTE_COLORS =
	'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const PALETTE_CLASS = `(?:^|[\\s:])!?[a-z]+(?:-[a-z]+)*-(?:${PALETTE_COLORS})-(?:50|[1-9]00|950)\\b`
const BANG_CLASS = '(?:^|[\\s:])!'
const INLINE_IMPORTANT = '!\\s*important'

// 実体を持たない export（`export * from` と `export { … }`）だけで構成されるのが barrel
const REEXPORT = ':matches(ExportAllDeclaration, ExportNamedDeclaration:has(> ExportSpecifier))'

const AREA_DIRECTORY_MESSAGE = `components/ の直下にファイルを置かない。layout / article / content / common / error のいずれかに入れる。 ${ARCHITECTURE_URL}`

const PAGE_CONTEXT_ROUTE_MESSAGE = `route を読むのは入口（pages/ layouts/ app.vue error.vue）だけ。ここでは props か引数で受け取る。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_404_MESSAGE = `components/ は404を送出しない（createError）。判定は pages/ 側で行う。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_META_MESSAGE = `components/ はページのメタを設定しない（useSeoMeta / useHead / definePageMeta / usePageSeo）。設定は pages/ 側で行う。 ${ARCHITECTURE_URL}`

// ディレクトリを跨ぐ参照は `~/`（app/ の外は `~~/`）。相対パスは同じディレクトリの中だけ
const CROSS_DIRECTORY_RELATIVE = ['..', '../*', '../**', './..', './../*', './../**']

// route に届く入口を落とす。値の読み方（.params・分割代入）ではなく取得そのものを見る
const ROUTE_ACCESS = [
	{
		selector: 'CallExpression[callee.name=/^useRouter?$/]',
		message: PAGE_CONTEXT_ROUTE_MESSAGE,
	},
	{
		selector: 'MemberExpression[property.name=/^\\$rou(te|ter)$/]',
		message: PAGE_CONTEXT_ROUTE_MESSAGE,
	},
]

// テンプレートの $route / $router。script と違い Vue が名前で解決するので import に現れない
const ROUTE_ACCESS_TEMPLATE = {
	selector: 'VExpressionContainer Identifier[name=/^\\$rou(te|ter)$/]',
	message: PAGE_CONTEXT_ROUTE_MESSAGE,
}

// components/ が持たないページの文脈。拡張子で落ちるものが変わらないよう1つにまとめる
const PAGE_CONTEXT = [
	...ROUTE_ACCESS,
	{
		selector: "CallExpression[callee.name='createError']",
		message: PAGE_CONTEXT_404_MESSAGE,
	},
	{
		selector: 'CallExpression[callee.name=/^(useSeoMeta|useHead|definePageMeta|usePageSeo)$/]',
		message: PAGE_CONTEXT_META_MESSAGE,
	},
]

// 角括弧を含むクラス（`w-[264px]` 等）がTailwindの任意値
const TEMPLATE_RESTRICTIONS = [
	{
		selector: "VAttribute[directive=false][key.name='class'] > VLiteral[value=/\\[/]",
		message: ARBITRARY_VALUE_MESSAGE,
	},
	{
		selector:
			"VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/\\[/], TemplateElement[value.cooked=/\\[/])",
		message: ARBITRARY_VALUE_MESSAGE,
	},
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${PALETTE_CLASS}/]`,
		message: PALETTE_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${PALETTE_CLASS}/], TemplateElement[value.cooked=/${PALETTE_CLASS}/])`,
		message: PALETTE_MESSAGE,
	},
	// クラスの `!` 修飾子と style 属性の !important。<style> の中は style/no-important が見る
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${BANG_CLASS}/]`,
		message: IMPORTANT_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${BANG_CLASS}/], TemplateElement[value.cooked=/${BANG_CLASS}/])`,
		message: IMPORTANT_MESSAGE,
	},
	{
		selector: `VAttribute[directive=false][key.name='style'] > VLiteral[value=/${INLINE_IMPORTANT}/i]`,
		message: IMPORTANT_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='style'] :matches(Literal[value=/${INLINE_IMPORTANT}/i], TemplateElement[value.cooked=/${INLINE_IMPORTANT}/i])`,
		message: IMPORTANT_MESSAGE,
	},
]

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
		{
			selector:
				':matches(Literal[value=/prefers-reduced-motion/], TemplateElement[value.cooked=/prefers-reduced-motion/])',
			message: REDUCED_MOTION_MESSAGE,
		},
	],
}

export default [
	{
		ignores: ['.nuxt/**', '.output/**', 'dist/**', 'node_modules/**'],
	},
	{
		files: ['app/**/*.ts'],
		plugins: { imports: importLayers },
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			...restrictions,
			'imports/order': 'error',
			'no-restricted-syntax': [
				...restrictions['no-restricted-syntax'],
				{
					selector: `Program:has(> ${REEXPORT}):not(:has(> :not(:matches(ImportDeclaration, ${REEXPORT}))))`,
					message: BARREL_MESSAGE,
				},
			],
		},
	},
	{
		files: ['app/**/*.vue'],
		plugins: { vue: pluginVue, style: styleTokens, imports: importLayers },
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
			'imports/order': 'error',
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
			'style/no-important': 'error',
			'style/no-reduced-motion': 'error',
			'vue/no-restricted-syntax': ['error', ...TEMPLATE_RESTRICTIONS],
		},
	},
	{
		// components/ はページの文脈（routeの読み取り・404・ページのメタ）を持たない
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
				...PAGE_CONTEXT,
			],
			'vue/no-restricted-syntax': ['error', ...TEMPLATE_RESTRICTIONS, ROUTE_ACCESS_TEMPLATE],
		},
	},
	{
		files: ['app/components/**/*.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				...restrictions['no-restricted-syntax'].slice(1),
				...PAGE_CONTEXT,
				{
					selector: `Program:has(> ${REEXPORT}):not(:has(> :not(:matches(ImportDeclaration, ${REEXPORT}))))`,
					message: BARREL_MESSAGE,
				},
			],
		},
	},
	{
		// components/ から呼ばれる層。route に届く経路を塞ぐ。404 はページ側の判定を受けて
		// composable が送出するので、ここでは落とさない
		files: ['app/composables/**/*.ts', 'app/utils/**/*.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				...restrictions['no-restricted-syntax'].slice(1),
				...ROUTE_ACCESS,
				{
					selector: `Program:has(> ${REEXPORT}):not(:has(> :not(:matches(ImportDeclaration, ${REEXPORT}))))`,
					message: BARREL_MESSAGE,
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
