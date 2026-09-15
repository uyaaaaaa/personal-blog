import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import importLayers from './eslint-rules/import-layers.mjs'
import rootFiles from './eslint-rules/root-files.mjs'
import styleTokens, {
	BREAKPOINT_LABEL,
	BREAKPOINT_MEDIA,
	BREAKPOINT_URL,
	COLOR_SCHEME_MESSAGE,
	DOCS_URL,
	FONT_CLASS_MESSAGE,
	INVARIANT_URL,
	MOTION_URL,
	OFF_BREAKPOINT_VARIANTS,
	OFF_TOKEN_FONT_CLASS,
	OUTLINE_REMOVAL_CLASS,
	OUTLINE_REMOVAL_PROPERTY,
	OUTLINE_REMOVAL_VALUE,
	OUTLINE_RESET_VALUE,
	SCROLL_BEHAVIOR_CLASS,
	SCROLL_BEHAVIOR_MESSAGE,
	SCROLL_BEHAVIOR_PROPERTY,
	STYLE_EXCEPTION,
	THEME_CLASS_MESSAGE,
	THEME_COLOR_CLASS,
	TOKEN_URL,
	WEB_FONT_MESSAGE,
	WEB_FONT_RESOURCE,
} from './eslint-rules/style-tokens.mjs'

const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`
const PALETTE_MESSAGE = `Tailwind 既定のパレット（text-red-500 等）は使わない。色は theme/tokens.ts のトークンの名前で書く。 ${TOKEN_URL}`

// どの判定も script が書く綴りに当たるので、.vue の外でも通す
const styleRules = Object.fromEntries(
	Object.keys(styleTokens.rules).map((name) => [`style/${name}`, 'error']),
)

const ARCHITECTURE_URL = `${DOCS_URL}/ARCHITECTURE.md#層と依存方向`
const AUTO_IMPORT_URL = `${DOCS_URL}/adr/02-no-auto-import.md`

const REDUCED_MOTION_MESSAGE = `prefers-reduced-motion で分岐しない。モーションの長さは用途ごとに1つ決める。 ${MOTION_URL}`
const BREAKPOINT_MESSAGE = `表示を出し分ける境界は ${BREAKPOINT_LABEL}の2つだけ。他の境界を作らない。 ${BREAKPOINT_URL}`
const BARREL_MESSAGE = `再エクスポートだけのファイル（barrel file）を作らない。実体のファイルを直接 import する。 ${ARCHITECTURE_URL}`
const SCROLL_SUBSCRIPTION_MESSAGE = `scroll / resize を個別に購読しない。読み取りを useScrollFrame に渡し、アプリ全体で1本の購読に集約する。 ${INVARIANT_URL}`
const IMPORTANT_MESSAGE = `!important は書かない。Tailwind の ! 修飾子と style 属性も同じ。第三者由来のインラインスタイルを打ち消すときだけ許す。${STYLE_EXCEPTION}`
const OUTLINE_MESSAGE = `フォーカスの輪郭を消さない。キーボードのフォーカス位置は常に見える。Tailwind の outline-none / outline-0 と style 属性も同じ。同じ要素に別の見える指標があるときだけ許す。${STYLE_EXCEPTION}`

const PALETTE_COLORS =
	'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const PALETTE_CLASS = `(?:^|[\\s:])!?[a-z]+(?:-[a-z]+)*-(?:${PALETTE_COLORS})-(?:50|[1-9]00|950)\\b`
// 任意値の variant（min-[600px]:）は角括弧の検査が落とす
const BREAKPOINT_CLASS = `(?:^|[\\s:])(?:${OFF_BREAKPOINT_VARIANTS.join('|')}):`
const BANG_CLASS = '(?:^|[\\s:])!'
const INLINE_IMPORTANT = '!\\s*important'
// :style のオブジェクトはキーと値に割れるので、綴りでは当たらない
const OUTLINE_KEY = '/^outline(?:-?(?:style|width|color))?$/i'
const OUTLINE_RESET_KEY = '/^(?:all|outline(?:-?style)?)$/i'
const styleObject = (key) =>
	`VAttribute[directive=true][key.argument.name='style'] :matches(Property[key.name=${key}], Property[key.value=${key}])`
// 値は条件式やテンプレート文字列の中にも入るので子孫まで見る。
// 比較の被演算子（`kind === 'none'`）は値ではないので外す
const outlineValue = (value) =>
	`:matches(Literal[value=/${value}/i], TemplateElement[value.cooked=/${value}/i]):not(BinaryExpression > *)`

const REEXPORT = ':matches(ExportAllDeclaration, ExportNamedDeclaration:has(> ExportSpecifier))'

const STDIN_MESSAGE =
	'標準入力は scripts/stdin.mjs だけが読む。読み取りの境目にまたがった多バイト文字が U+FFFD になる。'

// fd 0 と /dev/stdin も同じ入口。綴りを変えただけの読み取りを同じ判定で見る
const STDIN_FD = '/^(readFileSync|readFile|createReadStream|openSync|open)$/'
const STDIN_READ = [
	{
		selector: "MemberExpression[property.name='stdin']",
		message: STDIN_MESSAGE,
	},
	{
		selector: "MemberExpression[computed=true] > Literal[value='stdin']",
		message: STDIN_MESSAGE,
	},
	{
		// 第2引数以降の 0 に当たらないよう、最初の引数だけを見る
		selector: `CallExpression[callee.name=${STDIN_FD}] > Literal[value=0]:first-child`,
		message: STDIN_MESSAGE,
	},
	{
		selector: `CallExpression[callee.property.name=${STDIN_FD}] > Literal[value=0]:first-child`,
		message: STDIN_MESSAGE,
	},
	{
		selector:
			":matches(Literal[value='/dev/stdin'], TemplateElement[value.cooked='/dev/stdin'])",
		message: STDIN_MESSAGE,
	},
	// 束縛で受けると、読むところに process も stdin も綴られない
	{
		selector: "ImportSpecifier[imported.name='stdin']",
		message: STDIN_MESSAGE,
	},
	{
		selector: "ObjectPattern > Property[key.name='stdin']",
		message: STDIN_MESSAGE,
	},
]

const LANDING_MESSAGE = `ページ内ジャンプの着地位置は CSS が持つ。JS でオフセットを足さず、ページ全体を動かす呼び出しは useScrollTo に集約する。 ${INVARIANT_URL}`

const PAGE_SCROLLER = '/^(documentElement|body|scrollingElement)$/'
const SCROLL_METHOD = '/^scroll(To|By)?$/'
// Type 付きは Nuxt の router option。hash ジャンプと位置復元の behavior になる
const SCROLL_BEHAVIOR_KEY = '/^scrollBehavior(Type)?$/'

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
	{
		selector: "CallExpression[callee.property.name='scrollIntoView']",
		message: LANDING_MESSAGE,
	},
	{
		selector: `:matches(MemberExpression[property.name=${SCROLL_BEHAVIOR_KEY}], Property[key.name=${SCROLL_BEHAVIOR_KEY}], Property[key.value=${SCROLL_BEHAVIOR_KEY}])`,
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
	{
		selector: `:matches(Literal[value=/${SCROLL_BEHAVIOR_PROPERTY}/i], TemplateElement[value.cooked=/${SCROLL_BEHAVIOR_PROPERTY}/i])`,
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
	{
		selector: `:matches(Literal[value=/${SCROLL_BEHAVIOR_CLASS}/], TemplateElement[value.cooked=/${SCROLL_BEHAVIOR_CLASS}/])`,
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
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${OFF_TOKEN_FONT_CLASS}/]`,
		message: FONT_CLASS_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${OFF_TOKEN_FONT_CLASS}/], TemplateElement[value.cooked=/${OFF_TOKEN_FONT_CLASS}/])`,
		message: FONT_CLASS_MESSAGE,
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
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${OUTLINE_REMOVAL_CLASS}/]`,
		message: OUTLINE_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${OUTLINE_REMOVAL_CLASS}/], TemplateElement[value.cooked=/${OUTLINE_REMOVAL_CLASS}/])`,
		message: OUTLINE_MESSAGE,
	},
	{
		selector: `VAttribute[directive=false][key.name='style'] > VLiteral[value=/${OUTLINE_REMOVAL_PROPERTY}/i]`,
		message: OUTLINE_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='style'] :matches(Literal[value=/${OUTLINE_REMOVAL_PROPERTY}/i], TemplateElement[value.cooked=/${OUTLINE_REMOVAL_PROPERTY}/i])`,
		message: OUTLINE_MESSAGE,
	},
	{
		selector: `${styleObject(OUTLINE_KEY)} ${outlineValue(OUTLINE_REMOVAL_VALUE)}`,
		message: OUTLINE_MESSAGE,
	},
	{
		selector: `${styleObject(OUTLINE_RESET_KEY)} ${outlineValue(OUTLINE_RESET_VALUE)}`,
		message: OUTLINE_MESSAGE,
	},
	// 数値の 0 は esquery の正規表現が文字列にしか当たらないので別に見る。
	// 添字や条件の 0 まで拾わないよう値そのものだけを見て、文字列の '0' は上の綴りに任せる
	{
		selector: `${styleObject(OUTLINE_KEY)} > Literal[value=0][value=type(number)]`,
		message: OUTLINE_MESSAGE,
	},
	...PAGE_SCROLL,
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${SCROLL_BEHAVIOR_CLASS}/]`,
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
	{
		selector: `VAttribute[directive=false][key.name='style'] > VLiteral[value=/${SCROLL_BEHAVIOR_PROPERTY}/i]`,
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
		// メディア特性の名前は大小を区別しないので、外す側（style/*）と同じく /i で見る
		{
			selector:
				':matches(Literal[value=/prefers-reduced-motion/i], TemplateElement[value.cooked=/prefers-reduced-motion/i])',
			message: REDUCED_MOTION_MESSAGE,
		},
		{
			selector:
				':matches(Literal[value=/prefers-color-scheme/i], TemplateElement[value.cooked=/prefers-color-scheme/i])',
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
		plugins: { imports: importLayers, style: styleTokens },
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			...restrictions,
			...styleRules,
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
		plugins: { vue: pluginVue, style: styleTokens, imports: importLayers, roots: rootFiles },
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
			...styleRules,
			'roots/render-only': 'error',
			// 並びが eslint-disable の届く先を決めるので、見た目ではなく抑制のために固定する
			'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
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
		// 設定ファイルは app/ の規約の外
		files: ['*.config.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			'no-restricted-syntax': ['error', ...WEB_FONT, ...PAGE_SCROLL],
		},
	},
	{
		// 読み取りを1本に保つ。集約先そのものは除く
		files: withTest('.claude/hooks/**/*.mjs', 'scripts/**/*.mjs'),
		ignores: ['scripts/stdin.mjs'],
		rules: {
			'no-restricted-syntax': ['error', ...STDIN_READ],
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
