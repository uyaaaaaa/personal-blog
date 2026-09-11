import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import importLayers from './eslint-rules/import-layers.mjs'
import styleTokens, {
	BREAKPOINT_LABEL,
	BREAKPOINT_URL,
	BREAKPOINT_WIDTHS,
	COLOR_SCHEME_MESSAGE,
	DOCS_URL,
	INVARIANT_URL,
	MOTION_URL,
	OFF_BREAKPOINT_VARIANTS,
	SCROLL_BEHAVIOR_CLASS,
	SCROLL_BEHAVIOR_MESSAGE,
	THEME_CLASS_MESSAGE,
	THEME_COLOR_CLASS,
	TOKEN_URL,
	WEB_FONT_MESSAGE,
} from './eslint-rules/style-tokens.mjs'

const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`
const PALETTE_MESSAGE = `Tailwind 既定のパレット（text-red-500 等）は使わない。色は theme/tokens.ts のトークンの名前で書く。 ${TOKEN_URL}`

const ARCHITECTURE_URL = `${DOCS_URL}/ARCHITECTURE.md#層と依存方向`
const AUTO_IMPORT_URL = `${DOCS_URL}/adr/03-no-auto-import.md`

const REDUCED_MOTION_MESSAGE = `prefers-reduced-motion で分岐しない。モーションの長さは用途ごとに1つ決める。 ${MOTION_URL}`
const BREAKPOINT_MESSAGE = `表示を出し分ける境界は ${BREAKPOINT_LABEL}の2つだけ。他の境界を作らない。 ${BREAKPOINT_URL}`
const BARREL_MESSAGE = `再エクスポートだけのファイル（barrel file）を作らない。実体のファイルを直接 import する。 ${ARCHITECTURE_URL}`
const SCROLL_SUBSCRIPTION_MESSAGE = `scroll / resize を個別に購読しない。読み取りを useScrollFrame に渡し、アプリ全体で1本の購読に集約する。 ${INVARIANT_URL}`
const IMPORTANT_MESSAGE =
	'!important は書かない。Tailwind の ! 修飾子と style 属性も同じ。第三者由来のインラインスタイルを打ち消すときだけ、理由を添えた eslint-disable で許す。'

// フォントの実体と、フォントを配る先。`font-mono` 等のクラス名と混ざらないよう、
// 綴りの後ろが区切りか終端のものだけを見る（`typeface-roboto` があるので `-` はその2語だけ）
const FONT_FILE = '\\.(?:woff2?|otf|ttf|eot)\\b'
const FONT_HOST = '\\b(?:(?:fontsource|fonts?)(?:[./]|$)|(?:typeface|typekit)[./-])'
const WEB_FONT_RESOURCE = `(?:${FONT_FILE}|${FONT_HOST})`

const PALETTE_COLORS =
	'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const PALETTE_CLASS = `(?:^|[\\s:])!?[a-z]+(?:-[a-z]+)*-(?:${PALETTE_COLORS})-(?:50|[1-9]00|950)\\b`
// 任意値の variant（min-[600px]:）は角括弧の検査が落とす
const BREAKPOINT_CLASS = `(?:^|[\\s:])(?:${OFF_BREAKPOINT_VARIANTS.join('|')}):`
// 宣言（max-width: 36rem）と混ざらないよう、括弧から見る
const WIDTHS = BREAKPOINT_WIDTHS.join('|')
const WIDTH_BY_LENGTH = `\\((?=[^()]*width)[^()]*?(?<![\\d.])(?!(?:${WIDTHS})\\b)\\d*\\.?\\d+[a-z%]+`
// 組み立てた文字列は長さが別のリテラルに出るので、綴りからも見る
const WIDTH_BY_SPELLING = `\\((?:min|max)-width\\s*:(?!\\s*(?:${WIDTHS})\\s*\\))`
const BREAKPOINT_MEDIA = `(?:${WIDTH_BY_SPELLING}|${WIDTH_BY_LENGTH})`
const BANG_CLASS = '(?:^|[\\s:])!'
const INLINE_IMPORTANT = '!\\s*important'

const REEXPORT = ':matches(ExportAllDeclaration, ExportNamedDeclaration:has(> ExportSpecifier))'

const LANDING_MESSAGE = `ページ内ジャンプの着地位置は CSS が持つ。JS でオフセットを足さず、ページ全体を動かす呼び出しは useScrollTo に集約する。 ${INVARIANT_URL}`

// ページ全体を動かす受け手。要素を指す綴りは、そのページのスクロール要素を指す3つだけ
const PAGE_SCROLLER = '/^(documentElement|body|scrollingElement)$/'
const SCROLL_METHOD = '/^scroll(To|By)?$/'

// 集約先の useScrollTo だけが例外。除くために、この配列の同一性で識別する
const PAGE_SCROLL = [
	{
		selector: `CallExpression[callee.object.name=/^(window|globalThis|self)$/][callee.property.name=${SCROLL_METHOD}]`,
		message: LANDING_MESSAGE,
	},
	{
		selector: `CallExpression[callee.object.property.name=${PAGE_SCROLLER}][callee.property.name=${SCROLL_METHOD}]`,
		message: LANDING_MESSAGE,
	},
	{
		selector: `AssignmentExpression[left.object.property.name=${PAGE_SCROLLER}][left.property.name=/^scroll(Top|Left)$/]`,
		message: LANDING_MESSAGE,
	},
	// 器の中の項目送りは器の scrollTop が動かす。これはページごと動く
	{
		selector: "CallExpression[callee.property.name='scrollIntoView']",
		message: LANDING_MESSAGE,
	},
	// 宣言を JS から書く経路と、着地位置を JS が決める router の options
	{
		selector:
			":matches(MemberExpression[property.name='scrollBehavior'], Property[key.name='scrollBehavior'], Property[key.value='scrollBehavior'])",
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
	{
		selector:
			':matches(Literal[value=/scroll-behavior/i], TemplateElement[value.cooked=/scroll-behavior/i])',
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
]

// 集約先の useScrollFrame だけが例外。除くために、この配列の同一性で識別する
const SCROLL_SUBSCRIPTION = [
	{
		selector:
			'CallExpression[callee.property.name=/^(add|remove)EventListener$/] > Literal[value=/^(scroll|resize)$/]',
		message: SCROLL_SUBSCRIPTION_MESSAGE,
	},
	{
		selector: 'MemberExpression[property.name=/^on(scroll|resize)$/]',
		message: SCROLL_SUBSCRIPTION_MESSAGE,
	},
]

// 読み込みの経路そのものを塞ぐ。@font-face と CSS の @import は style/no-web-font が見る
const WEB_FONT = [
	{
		// 1つの selector にまとめる。分けると両方に当たる文字列が2回報告される
		selector: [
			`:matches(Literal[value=/${WEB_FONT_RESOURCE}/i], TemplateElement[value.cooked=/${WEB_FONT_RESOURCE}/i])`,
			// フォントを読み込むモジュール（@nuxt/fonts 等）と、設定が並べる指定子。名前で見る
			':matches(ImportDeclaration, ImportExpression) > Literal[value=/font/i]',
			// typography の css は配列を持たないので当たらない
			'Property[key.name=/^(modules|css)$/] ArrayExpression Literal[value=/font/i]',
		].join(', '),
		message: WEB_FONT_MESSAGE,
	},
	{
		selector: "NewExpression[callee.name='FontFace']",
		message: WEB_FONT_MESSAGE,
	},
	{
		selector: "MemberExpression[property.name='fonts']",
		message: WEB_FONT_MESSAGE,
	},
]

const AREA_DIRECTORY_MESSAGE = `components/ の直下にファイルを置かない。layout / article / content / common / error のいずれかに入れる。 ${ARCHITECTURE_URL}`

const PAGE_CONTEXT_ROUTE_MESSAGE = `route を読むのは入口（pages/ layouts/ app.vue error.vue）だけ。ここでは props か引数で受け取る。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_404_MESSAGE = `components/ は404を送出しない（createError）。判定は pages/ 側で行う。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_META_MESSAGE = `components/ はページのメタを設定しない（useSeoMeta / useHead / definePageMeta / usePageSeo）。設定は pages/ 側で行う。 ${ARCHITECTURE_URL}`

const CROSS_DIRECTORY_RELATIVE = ['..', '../*', '../**', './..', './../*', './../**']

// 値の読み方（.params・分割代入）ではなく、route を取得するところを見る
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

// script と違いテンプレートの $route / $router は Vue が名前で解決するので、import に現れない
const ROUTE_ACCESS_TEMPLATE = {
	selector: 'VExpressionContainer Identifier[name=/^\\$rou(te|ter)$/]',
	message: PAGE_CONTEXT_ROUTE_MESSAGE,
}

// 拡張子で落ちるものが変わらないよう1つにまとめる
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
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${THEME_COLOR_CLASS}/]`,
		message: THEME_CLASS_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${THEME_COLOR_CLASS}/], TemplateElement[value.cooked=/${THEME_COLOR_CLASS}/])`,
		message: THEME_CLASS_MESSAGE,
	},
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${BREAKPOINT_CLASS}/]`,
		message: BREAKPOINT_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${BREAKPOINT_CLASS}/], TemplateElement[value.cooked=/${BREAKPOINT_CLASS}/])`,
		message: BREAKPOINT_MESSAGE,
	},
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
	...PAGE_SCROLL,
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${SCROLL_BEHAVIOR_CLASS}/]`,
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${SCROLL_BEHAVIOR_CLASS}/], TemplateElement[value.cooked=/${SCROLL_BEHAVIOR_CLASS}/])`,
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
	// テンプレートに直接書く <link href>。属性を限らず、読み込む先の綴りで見る
	{
		selector: `VAttribute[directive=false] > VLiteral[value=/${WEB_FONT_RESOURCE}/i]`,
		message: WEB_FONT_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true] :matches(Literal[value=/${WEB_FONT_RESOURCE}/i], TemplateElement[value.cooked=/${WEB_FONT_RESOURCE}/i])`,
		message: WEB_FONT_MESSAGE,
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
			selector:
				'CallExpression[callee.property.name=/^(add|remove)EventListener$/] > Literal[value=/^(before)?unload$/]',
			message:
				'unload / beforeunload は購読しない。bfcache を壊すので、離脱時の処理は pagehide か visibilitychange に置く。',
		},
		{
			selector: 'MemberExpression[property.name=/^on(before)?unload$/]',
			message:
				'onunload / onbeforeunload は使わない。bfcache を壊すので、離脱時の処理は pagehide か visibilitychange に置く。',
		},
		{
			selector:
				':matches(Literal[value=/prefers-reduced-motion/], TemplateElement[value.cooked=/prefers-reduced-motion/])',
			message: REDUCED_MOTION_MESSAGE,
		},
		{
			selector:
				':matches(Literal[value=/prefers-color-scheme/], TemplateElement[value.cooked=/prefers-color-scheme/])',
			message: COLOR_SCHEME_MESSAGE,
		},
		{
			selector: `:matches(Literal[value=/${BREAKPOINT_MEDIA}/i], TemplateElement[value.cooked=/${BREAKPOINT_MEDIA}/i])`,
			message: BREAKPOINT_MESSAGE,
		},
		...SCROLL_SUBSCRIPTION,
		...PAGE_SCROLL,
		...WEB_FONT,
	],
}

// 404 はページ側の判定を受けて composable が送出するので、ここでは落とさない
const CALLED_LAYER_SYNTAX = [
	...restrictions['no-restricted-syntax'].slice(1),
	...ROUTE_ACCESS,
	{
		selector: `Program:has(> ${REEXPORT}):not(:has(> :not(:matches(ImportDeclaration, ${REEXPORT}))))`,
		message: BARREL_MESSAGE,
	},
]

const withTest = (...patterns) => patterns.flatMap((pattern) => [pattern, `tests/${pattern}`])

export default [
	{
		ignores: ['.nuxt/**', '.output/**', 'dist/**', 'node_modules/**'],
	},
	{
		files: withTest('app/**/*.ts'),
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
		files: withTest('app/**/*.vue'),
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
			'style/no-untokenized-size': 'error',
			'style/no-color-literal': 'error',
			'style/no-important': 'error',
			'style/no-reduced-motion': 'error',
			'style/no-custom-breakpoint': 'error',
			'style/no-web-font': 'error',
			'style/no-theme-branch': 'error',
			'style/no-scroll-behavior': 'error',
			'vue/no-restricted-syntax': ['error', ...TEMPLATE_RESTRICTIONS],
		},
	},
	{
		files: withTest('app/components/**/*.vue'),
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
		files: withTest('app/components/**/*.ts'),
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
		files: withTest('app/composables/**/*.ts', 'app/utils/**/*.ts'),
		rules: {
			'no-restricted-syntax': ['error', ...CALLED_LAYER_SYNTAX],
		},
	},
	{
		files: ['app/composables/useScrollFrame.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				...CALLED_LAYER_SYNTAX.filter((rule) => !SCROLL_SUBSCRIPTION.includes(rule)),
			],
		},
	},
	{
		files: ['app/composables/useScrollTo.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				...CALLED_LAYER_SYNTAX.filter((rule) => !PAGE_SCROLL.includes(rule)),
			],
		},
	},
	{
		// 設定ファイルは app/ の規約の外。読み込みの経路（modules・css・head.link）だけを見る
		files: ['*.config.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			'no-restricted-syntax': ['error', ...WEB_FONT],
		},
	},
	{
		files: withTest('app/components/*.{vue,ts}'),
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
