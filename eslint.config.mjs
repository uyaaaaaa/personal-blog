import tsParser from '@typescript-eslint/parser'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import { ignores } from './scripts/inputs.mjs'
import articleQueries from './eslint-rules/article-queries.mjs'
import importLayers from './eslint-rules/import-layers.mjs'
import rootFiles from './eslint-rules/root-files.mjs'
import styleTokens, {
	BREAKPOINT_LABEL,
	BREAKPOINT_URL,
	COLOR_SCHEME_MESSAGE,
	DOCS_URL,
	FONT_CLASS_MESSAGE,
	INVARIANT_URL,
	MAX_WIDTH_VARIANTS,
	OFF_TOKEN_FONT_CLASS,
	OUTLINE_REMOVAL_CLASS,
	SCROLL_BEHAVIOR_CLASS,
	SCROLL_BEHAVIOR_MESSAGE,
	scriptSpellingSelector,
	STYLE_EXCEPTION,
	THEME_CLASS_MESSAGE,
	THEME_COLOR_CLASS,
	TOKEN_URL,
	WEB_FONT_MESSAGE,
	WEB_FONT_RESOURCE,
} from './eslint-rules/style-tokens.mjs'

const ARBITRARY_VALUE_MESSAGE = `Tailwindの任意値は使わない。サイズは theme/tokens.ts の sizes / fontSize に名前を足し、その名前のクラスで書く。 ${TOKEN_URL}`

const styleRules = Object.fromEntries(
	Object.keys(styleTokens.rules).map((name) => [`style/${name}`, 'error']),
)

const ARCHITECTURE_URL = `${DOCS_URL}/ARCHITECTURE.md#層と依存方向`
const AUTO_IMPORT_URL = `${DOCS_URL}/adr/02-no-auto-import.md`

const BREAKPOINT_MESSAGE = `表示を出し分ける境界は ${BREAKPOINT_LABEL}の2つだけ。他の境界を作らない。 ${BREAKPOINT_URL}`
const MAX_WIDTH_MESSAGE = `幅の出し分けは ${BREAKPOINT_LABEL}から上に向けて書く。max-* で下に向けて書くと、同じ境界を指す書き方が2通りになる。 ${BREAKPOINT_URL}`
const BARREL_MESSAGE = `再エクスポートだけのファイル（barrel file）を作らない。実体のファイルを直接 import する。 ${ARCHITECTURE_URL}`
const SCROLL_SUBSCRIPTION_MESSAGE = `scroll / resize を個別に購読しない。読み取りを useScrollFrame に渡し、アプリ全体で1本の購読に集約する。 ${INVARIANT_URL}`
const DOM_ASSEMBLY_MESSAGE = `composable と utils は DOM を組み立てない。要素の生成・複製・挿入・文字列からの差し込みは、それを描くテンプレートが持つ。読み取り・購読・フォーカスの移動はここで行ってよい。 ${ARCHITECTURE_URL}`
const IMPORTANT_MESSAGE = `!important は書かない。Tailwind の ! 修飾子も同じ。第三者由来のインラインスタイルを打ち消すときだけ許す。${STYLE_EXCEPTION}`
const OUTLINE_MESSAGE = `フォーカスの輪郭を消さない。キーボードのフォーカス位置は常に見える。Tailwind の outline-none / outline-0 も同じ。同じ要素に別の見える指標があるときだけ許す。${STYLE_EXCEPTION}`

const MAX_WIDTH_CLASS = `(?:^|[\\s:])(?:${MAX_WIDTH_VARIANTS.join('|')}):`
const BANG_CLASS = '(?:^|[\\s:])!'
const REEXPORT = ':matches(ExportAllDeclaration, ExportNamedDeclaration:has(> ExportSpecifier))'

const STDIN_MESSAGE =
	'標準入力は scripts/stdin.mjs だけが読む。読み取りの境目にまたがった多バイト文字が U+FFFD になる。'

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
	{
		selector: "ImportSpecifier[imported.name='stdin']",
		message: STDIN_MESSAGE,
	},
	{
		selector: "ObjectPattern > Property[key.name='stdin']",
		message: STDIN_MESSAGE,
	},
]

const INPUTS_MJS = 'scripts/inputs.mjs'
const CHECK_INPUT_MESSAGE = `検査が入力を読む口は ${INPUTS_MJS} だけ。素の読み取りは、どの入力がなぜ駄目かの1行を出さずにスタックで落ちる。`

const CHECK_INPUT_MODULES = [
	'fs',
	'node:fs',
	'fs/promises',
	'node:fs/promises',
	'module',
	'node:module',
]

const JSON_OBJECT = [
	"[object.name='JSON']",
	"[object.property.name='JSON']",
	"[object.property.value='JSON']",
].join(', ')
const JSON_PARSE = "[property.name='parse'], [property.value='parse']"
const JSON_BOUND = [
	"[init.name='JSON']",
	"[init.property.name='JSON']",
	"[init.property.value='JSON']",
].join(', ')

const CHECK_INPUT = [
	{
		selector: 'ImportExpression',
		message: CHECK_INPUT_MESSAGE,
	},
	{
		selector: `MemberExpression:matches(${JSON_OBJECT}):matches(${JSON_PARSE})`,
		message: CHECK_INPUT_MESSAGE,
	},
	{
		selector: `VariableDeclarator:matches(${JSON_BOUND}) ObjectPattern > Property[key.name='parse']`,
		message: CHECK_INPUT_MESSAGE,
	},
	{
		selector: 'CallExpression[callee.name=/^(require|createRequire)$/]',
		message: CHECK_INPUT_MESSAGE,
	},
	{
		selector:
			'CallExpression[callee.property.name=/^(createRequire|getBuiltinModule|binding)$/]',
		message: CHECK_INPUT_MESSAGE,
	},
]

const LANDING_MESSAGE = `ページ内ジャンプの着地位置は CSS が持つ。JS でオフセットを足さず、ページ全体を動かす呼び出しは useScrollTo に集約する。 ${INVARIANT_URL}`

const PAGE_SCROLLER = '/^(documentElement|body|scrollingElement)$/'
const SCROLL_METHOD = '/^scroll(To|By)?$/'
const SCROLL_BEHAVIOR_KEY = '/^scrollBehavior(Type)?$/'

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
		selector: scriptSpellingSelector('no-scroll-behavior'),
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
]

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

const WEB_FONT = [
	{
		selector: [
			scriptSpellingSelector('no-web-font'),
			':matches(ImportDeclaration, ImportExpression) > Literal[value=/font/i]',
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

const INLINE_STYLE_MESSAGE =
	'スタイルを style 属性と el.style に書かない。宣言を置けるのは Tailwind のクラスと <style> / .css だけ。JS から渡すのは CSS カスタムプロパティの値にし、それを読む宣言を <style> に置く。'
const STYLESHEET_MESSAGE =
	'script でスタイルシートを組み立てない。規則の置き場は .vue の <style> と .css だけで、lint が読むのもそこだけ。'

const CUSTOM_PROPERTY = '/^--/'
const STYLE_BINDING = "VAttribute[directive=true][key.argument.name='style'] > VExpressionContainer"
const STYLE_WRITE = [
	"[left.object.property.name='style']",
	"[left.object.property.value='style']",
	"[left.property.name='style']",
	"[left.property.value='style']",
].join(', ')
const STYLE_CALL =
	"CallExpression:matches([callee.object.property.name='style'], [callee.object.property.value='style'])"
const PROPERTY_WRITE = '/^(?:set|remove)Property$/'

const INLINE_STYLE = [
	{
		selector: "VAttribute[directive=false][key.name='style']",
		message: INLINE_STYLE_MESSAGE,
	},
	{
		selector: `${STYLE_BINDING} > *:not(ObjectExpression)`,
		message: INLINE_STYLE_MESSAGE,
	},
	{
		selector: `${STYLE_BINDING} > ObjectExpression > :not(Property[key.value=${CUSTOM_PROPERTY}])`,
		message: INLINE_STYLE_MESSAGE,
	},
	{
		selector: `AssignmentExpression:matches(${STYLE_WRITE})`,
		message: INLINE_STYLE_MESSAGE,
	},
	{
		selector: `${STYLE_CALL}[callee.property.name=${PROPERTY_WRITE}]:not([arguments.0.value=${CUSTOM_PROPERTY}])`,
		message: INLINE_STYLE_MESSAGE,
	},
	{
		selector: `CallExpression[callee.property.name='assign'] > MemberExpression:matches([property.name='style'], [property.value='style'])`,
		message: INLINE_STYLE_MESSAGE,
	},
	{
		selector: "CallExpression[callee.property.name='setAttribute'] > Literal[value=/^style$/i]",
		message: INLINE_STYLE_MESSAGE,
	},
]

const STYLESHEET_API =
	'/^(?:styleSheets|adoptedStyleSheets|insertRule|deleteRule|addRule|removeRule)$/'

const AT_RULE =
	'@(?:media|supports|font-face|import|keyframes|layer|page|property|charset|namespace)\\b[^{};]*[{;]'
const RULE_BLOCK = '\\{[^{}]*(?<![\\w"\'-])[a-z-]+\\s*:[^{}]*\\}'
const INSERT_CALL = 'CallExpression[callee.property.name=/^(?:insert|add)Rule$/]'
const STYLESHEET_STRING = `<style[\\s\\/>]|${AT_RULE}|${RULE_BLOCK}`

const STYLESHEET_ASSEMBLY = [
	{
		selector: `MemberExpression:matches([property.name=${STYLESHEET_API}], [property.value=${STYLESHEET_API}])`,
		message: STYLESHEET_MESSAGE,
	},
	{
		selector: "NewExpression[callee.name='CSSStyleSheet']",
		message: STYLESHEET_MESSAGE,
	},
	{
		selector:
			'CallExpression[callee.property.name=/^createElement(?:NS)?$/] > Literal[value=/^style$/i]',
		message: STYLESHEET_MESSAGE,
	},
	{
		selector: `:matches(Literal[value=/${STYLESHEET_STRING}/i], TemplateElement[value.cooked=/${STYLESHEET_STRING}/i]):not(${INSERT_CALL} *)`,
		message: STYLESHEET_MESSAGE,
	},
]

export const COMPONENT_AREAS = ['layout', 'article', 'content', 'error', 'ui']

export const AREA_DIRECTORY_MESSAGE = `components/ の直下にファイルを置かない。${COMPONENT_AREAS.join(' / ')} のいずれかに入れる。 ${ARCHITECTURE_URL}`

const PAGE_CONTEXT_ROUTE_MESSAGE = `route を読むのは入口（pages/ layouts/ app.vue error.vue）だけ。ここでは props か引数で受け取る。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_404_MESSAGE = `components/ は404を送出しない（createError）。判定は pages/ 側で行う。 ${ARCHITECTURE_URL}`
const PAGE_CONTEXT_META_MESSAGE = `components/ はページのメタを設定しない（useSeoMeta / useHead / definePageMeta / usePageSeo）。設定は pages/ 側で行う。 ${ARCHITECTURE_URL}`

const CROSS_DIRECTORY_RELATIVE = ['..', '../*', '../**', './..', './../*', './../**']

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

const ROUTE_ACCESS_TEMPLATE = {
	selector: 'VExpressionContainer Identifier[name=/^\\$rou(te|ter)$/]',
	message: PAGE_CONTEXT_ROUTE_MESSAGE,
}

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
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${MAX_WIDTH_CLASS}/]`,
		message: MAX_WIDTH_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${MAX_WIDTH_CLASS}/], TemplateElement[value.cooked=/${MAX_WIDTH_CLASS}/])`,
		message: MAX_WIDTH_MESSAGE,
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
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${OUTLINE_REMOVAL_CLASS}/]`,
		message: OUTLINE_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true][key.argument.name='class'] :matches(Literal[value=/${OUTLINE_REMOVAL_CLASS}/], TemplateElement[value.cooked=/${OUTLINE_REMOVAL_CLASS}/])`,
		message: OUTLINE_MESSAGE,
	},
	...PAGE_SCROLL,
	{
		selector: `VAttribute[directive=false][key.name='class'] > VLiteral[value=/${SCROLL_BEHAVIOR_CLASS}/]`,
		message: SCROLL_BEHAVIOR_MESSAGE,
	},
	{
		selector: `VAttribute[directive=false] > VLiteral[value=/${WEB_FONT_RESOURCE}/i]`,
		message: WEB_FONT_MESSAGE,
	},
	{
		selector: `VAttribute[directive=true] :matches(Literal[value=/${WEB_FONT_RESOURCE}/i], TemplateElement[value.cooked=/${WEB_FONT_RESOURCE}/i])`,
		message: WEB_FONT_MESSAGE,
	},
	...INLINE_STYLE,
	...STYLESHEET_ASSEMBLY,
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
			selector: scriptSpellingSelector('no-theme-branch'),
			message: COLOR_SCHEME_MESSAGE,
		},
		{
			selector: scriptSpellingSelector('no-custom-breakpoint'),
			message: BREAKPOINT_MESSAGE,
		},
		...SCROLL_SUBSCRIPTION,
		...PAGE_SCROLL,
		...WEB_FONT,
		...INLINE_STYLE,
		...STYLESHEET_ASSEMBLY,
	],
}

const DOM_CREATE =
	'create(?:Element(?:NS)?|TextNode|DocumentFragment|Comment|Attribute(?:NS)?|ContextualFragment)'
const DOM_CLONE = 'cloneNode|importNode|adoptNode'
const DOM_INSERT =
	'appendChild|insertBefore|insertNode|replaceChild|replaceChildren|insertAdjacent(?:Element|Text|HTML)|prepend|before|after|replaceWith'
const DOM_FROM_STRING = 'parseFromString|parseHTML(?:Unsafe)?|setHTML(?:Unsafe)?'
const DOM_ASSEMBLY_METHOD = `/^(?:${DOM_CREATE}|${DOM_CLONE}|${DOM_INSERT}|${DOM_FROM_STRING})$/`
const DOM_CONSTRUCTOR = '/^(?:Image|Option|Audio|Text|Comment|DocumentFragment|DOMParser)$/'
const VNODE =
	'/^(?:h|createVNode|createElementVNode|createElementBlock|createTextVNode|createCommentVNode|createStaticVNode|cloneVNode|createApp|defineComponent)$/'
const HTML_SINK = '/^(?:inner|outer)HTML$/'

const DOM_ASSEMBLY = [
	{
		selector: `CallExpression:matches([callee.property.name=${DOM_ASSEMBLY_METHOD}], [callee.property.value=${DOM_ASSEMBLY_METHOD}])`,
		message: DOM_ASSEMBLY_MESSAGE,
	},
	{
		selector: `NewExpression[callee.name=${DOM_CONSTRUCTOR}]`,
		message: DOM_ASSEMBLY_MESSAGE,
	},
	{
		selector: `CallExpression[callee.name=${VNODE}]`,
		message: DOM_ASSEMBLY_MESSAGE,
	},
	{
		selector: `AssignmentExpression:matches([left.property.name=${HTML_SINK}], [left.property.value=${HTML_SINK}])`,
		message: DOM_ASSEMBLY_MESSAGE,
	},
	{
		selector: `CallExpression[callee.object.name='document'][callee.property.name=/^write(?:ln)?$/]`,
		message: DOM_ASSEMBLY_MESSAGE,
	},
]

const CALLED_LAYER_SYNTAX = [
	...restrictions['no-restricted-syntax'].slice(1),
	...ROUTE_ACCESS,
	...DOM_ASSEMBLY,
	{
		selector: `Program:has(> ${REEXPORT}):not(:has(> :not(:matches(ImportDeclaration, ${REEXPORT}))))`,
		message: BARREL_MESSAGE,
	},
]

const withTest = (...patterns) => patterns.flatMap((pattern) => [pattern, `tests/${pattern}`])

export default [
	{
		ignores: ignores.map((name) => `${name}/**`),
	},
	{
		files: withTest('app/**/*.ts'),
		plugins: { imports: importLayers, queries: articleQueries },
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
			'queries/location': 'error',
			'queries/published': 'error',
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
		plugins: {
			vue: pluginVue,
			style: styleTokens,
			imports: importLayers,
			roots: rootFiles,
			queries: articleQueries,
		},
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
			'queries/location': 'error',
			'queries/published': 'error',
			'vue/no-undef-components': [
				'error',
				{
					ignorePatterns: ['Nuxt[A-Z]\\w*', 'ContentRenderer'],
				},
			],
			...styleRules,
			'roots/render-only': 'error',
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
		files: ['tests/app/composables/**/*.ts', 'tests/app/utils/**/*.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				...CALLED_LAYER_SYNTAX.filter((rule) => !DOM_ASSEMBLY.includes(rule)),
			],
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
		files: withTest('.claude/hooks/**/*.mjs', 'scripts/**/*.mjs'),
		ignores: ['scripts/stdin.mjs'],
		rules: {
			'no-restricted-syntax': ['error', ...STDIN_READ],
		},
	},
	{
		files: ['scripts/check-*.mjs', 'scripts/article-files.mjs'],
		ignores: [INPUTS_MJS],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: CHECK_INPUT_MODULES.map((name) => ({
						name,
						message: CHECK_INPUT_MESSAGE,
					})),
				},
			],
			'no-restricted-syntax': ['error', ...STDIN_READ, ...CHECK_INPUT],
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
