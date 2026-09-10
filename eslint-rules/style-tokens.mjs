import postcss from 'postcss'
import resolveConfig from 'tailwindcss/resolveConfig.js'
import { colors, sizes } from '../theme/tokens.ts'

export const DOCS_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs'
export const TOKEN_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#a-単一情報源`
export const MOTION_URL = `${DOCS_URL}/adr/02-no-prefers-reduced-motion.md`
export const BREAKPOINT_URL = `${DOCS_URL}/adr/15-two-breakpoints.md`

export const WEB_FONT_MESSAGE =
	'Web フォントを読み込まない。表示速度が先。文字は theme/tokens.ts の fontFamily が並べるシステムフォントで組む。'

export const THEME_BRANCH_MESSAGE =
	'テーマごとに宣言を分岐しない。差は theme/tokens.ts の darkColors が作る。.dark と .light に書けるのはカスタムプロパティの再定義だけ。'

export const COLOR_SCHEME_MESSAGE =
	'prefers-color-scheme で分岐しない。テーマを持つのは .dark / .light クラスで、色の差は theme/tokens.ts の darkColors が作る。'

export const THEME_CLASS_MESSAGE =
	'dark: で色を分岐しない。テーマの差は theme/tokens.ts の darkColors が作る。dark: を書くのはテーマで DOM を出し分けるときだけ。'

// 色を取る接頭辞。末尾の名前だけで見ると box-border や align-sub まで当たる
const COLOR_PREFIX =
	'text|bg|border|divide|outline|ring|ring-offset|shadow|accent|caret|decoration|fill|stroke|placeholder|from|via|to'
// white / black / transparent / current は Tailwind が既定で持つ
const COLOR_NAME = [...Object.keys(colors), 'white', 'black', 'transparent', 'current'].join('|')
// dark: の後ろにも variant が続く。辺を指す指定（border-t）は1文字
export const THEME_COLOR_CLASS = `(?:^|[\\s:])dark:(?:[a-z-]+:)*!?(?:${COLOR_PREFIX})(?:-[a-z])?-(?:${COLOR_NAME})(?![a-z-])`

// 長さの語彙を持つ theme のセクション。ここに無いもの（blur・boxShadow 等）は語彙に数えない
const LENGTH_SECTIONS = [
	'spacing',
	'fontSize',
	'lineHeight',
	'borderRadius',
	'borderWidth',
	'outlineWidth',
	'outlineOffset',
	'width',
	'minWidth',
	'maxWidth',
	'height',
	'minHeight',
	'maxHeight',
	'screens',
]

const LENGTH = /(-?)(\d*\.?\d+)(px|rem)\b/gi
const HEX = /#[0-9a-f]{3,8}\b/gi
const COLOR_FUNCTION = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(\s*[^)]*\)/gi
const QUOTED = /'[^']*'|"[^"]*"/g
const URL_FUNCTION = /url\((?:[^()]|\([^()]*\))*\)/gi
const CUSTOM_PROPERTY = /--[A-Za-z0-9_-]+/g

const stripNonValues = (value) => value.replace(QUOTED, '').replace(URL_FUNCTION, '')

// transparent と currentColor は色の指定ではないので含めない
const NAMED_COLORS = new Set(
	'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(
		' ',
	),
)

function collectStrings(value, into) {
	if (typeof value === 'string') into.add(value)
	else if (Array.isArray(value)) for (const item of value) collectStrings(item, into)
	else if (value && typeof value === 'object')
		for (const item of Object.values(value)) collectStrings(item, into)
}

// tailwind.config.ts 自体は node が型注釈を落とせず読めないため、ここで組み直す
const theme = resolveConfig({ content: [], theme: { extend: { ...sizes } } }).theme

// 語彙は Tailwind の既定の theme に sizes を重ねて作る。sizes に名前を足せば通る
function buildVocabulary() {
	const strings = new Set()
	for (const section of LENGTH_SECTIONS) collectStrings(theme[section], strings)
	collectStrings(sizes, strings)

	const vocabulary = { px: new Set(), rem: new Set() }
	for (const string of strings) {
		for (const [, , number, unit] of string.matchAll(LENGTH)) {
			vocabulary[unit.toLowerCase()].add(Number(number))
		}
	}
	return vocabulary
}

const vocabulary = buildVocabulary()

const BREAKPOINTS = ['md', 'lg']

const MEDIA_LENGTH = /(\d*\.?\d+)([a-z]+)\b/gi
// メディアクエリの em は初期フォントサイズが基準なので rem と同じ
const PIXELS_PER = { px: 1, rem: 16, em: 16 }

const toPixels = (number, unit) => Number(number) * PIXELS_PER[unit.toLowerCase()]

function buildBreakpoints() {
	const pixels = new Set()
	const labels = []
	for (const name of BREAKPOINTS) {
		const value = String(theme.screens[name])
		const [[, number, unit]] = value.matchAll(MEDIA_LENGTH)
		pixels.add(toPixels(number, unit))
		labels.push(`${name}（${value}）`)
	}
	return { pixels, label: labels.join('と ') }
}

const breakpoints = buildBreakpoints()

export const BREAKPOINT_LABEL = breakpoints.label

export const BREAKPOINT_WIDTHS = [...breakpoints.pixels].flatMap((px) =>
	Object.entries(PIXELS_PER).map(([unit, scale]) => `${px / scale}${unit}`),
)

export const OFF_BREAKPOINT_VARIANTS = [
	...Object.keys(theme.screens).filter((name) => !BREAKPOINTS.includes(name)),
	...Object.keys(theme.screens).map((name) => `max-${name}`),
]

function offsetsOf(css) {
	const offsets = [0]
	for (let i = 0; i < css.length; i++) if (css[i] === '\n') offsets.push(i + 1)
	return offsets
}

function channelsOf(literal) {
	if (literal.startsWith('#')) {
		const digits = literal.slice(1)
		const step = digits.length <= 4 ? 1 : 2
		const channel = (i) =>
			parseInt(digits.slice(i * step, i * step + step).repeat(step === 1 ? 2 : 1), 16)
		return [channel(0), channel(1), channel(2)]
	}
	const args = literal.slice(literal.indexOf('(') + 1, literal.lastIndexOf(')'))
	return args
		.split('/')[0]
		.split(/[\s,]+/)
		.filter(Boolean)
		.slice(0, 3)
		.map((part) => (part.endsWith('%') ? (Number.parseFloat(part) * 255) / 100 : Number(part)))
}

function isWhiteOrBlack(literal) {
	const lower = literal.toLowerCase()
	if (lower === 'white' || lower === 'black') return true
	if (!/^(#|rgba?\()/i.test(lower)) return false
	const channels = channelsOf(lower)
	return (
		channels.length === 3 &&
		(channels.every((c) => c === 0) || channels.every((c) => c === 255))
	)
}

function eachStyleBlock(context, visit) {
	const services = context.sourceCode.parserServices ?? context.parserServices
	const document = services?.getDocumentFragment?.()
	if (!document) return

	for (const element of document.children) {
		if (element.type !== 'VElement' || element.name !== 'style') continue
		for (const child of element.children) {
			if (child.type !== 'VText') continue

			let root
			try {
				root = postcss.parse(child.value, { from: undefined })
			} catch {
				continue
			}
			const offsets = offsetsOf(child.value)
			const locate = (node) => {
				const start = node.source.start
				const index = child.range[0] + offsets[start.line - 1] + start.column - 1
				return context.sourceCode.getLocFromIndex(index)
			}
			visit(root, locate)
		}
	}
}

const REDUCED_MOTION = /prefers-reduced-motion/i
const MEDIA_CONDITION = /\(([^()]*)\)/g
const WIDTH_FEATURE = /\bwidth\b/i
// colorMode の classSuffix が空なので、テーマは html の dark / light で表れる。
// `html.dark` `.dark .callout` `:is(.light)` のいずれも綴りで拾い、`.darkroom` は後ろで外す
const THEME_SELECTOR = /\.(?:dark|light)(?![\w-])/
const COLOR_SCHEME = /prefers-color-scheme/i
const THEME_CLASS = new RegExp(THEME_COLOR_CLASS)

// 判定の正本。<style> は ESLint のルールとして、.css は scripts/check-css.mjs から同じものを使う
const CHECKS = {
	'no-untokenized-size': {
		messages: {
			untokenized: `{{literal}} は Tailwind のスケールにも theme/tokens.ts の sizes にも無い。sizes に名前を足すか、スケールの値で書く。 ${TOKEN_URL}`,
		},
		find(root) {
			const found = []
			const check = (value, node) => {
				for (const [literal, , number, unit] of stripNonValues(value).matchAll(LENGTH)) {
					if (vocabulary[unit.toLowerCase()].has(Math.abs(Number(number)))) continue
					found.push({ node, messageId: 'untokenized', data: { literal } })
				}
			}
			root.walkDecls((decl) => check(decl.value, decl))
			root.walkAtRules((rule) => check(rule.params, rule))
			return found
		},
	},

	'no-color-literal': {
		messages: {
			literal: `色の直値（{{literal}}）は書かない。theme/tokens.ts に足して var(--color-*) で参照する。 ${TOKEN_URL}`,
		},
		find(root) {
			const found = []
			const check = (value, node) => {
				const text = stripNonValues(value).replace(CUSTOM_PROPERTY, '')
				const matches = [
					...text.matchAll(HEX),
					...text.matchAll(COLOR_FUNCTION),
					...[...text.matchAll(/\b[a-z]+\b(?!\s*\()/gi)].filter((match) =>
						NAMED_COLORS.has(match[0].toLowerCase()),
					),
				]
				for (const [literal] of matches) {
					// var() を含む関数はトークン由来（Callout の --callout-rgb）
					if (literal.includes('var(') || isWhiteOrBlack(literal)) continue
					found.push({ node, messageId: 'literal', data: { literal } })
				}
			}
			root.walkDecls((decl) => check(decl.value, decl))
			// walkDecls は at-rule を見ないので、@apply の任意値は別に歩く。
			// 他の at-rule まで見ると、@keyframes の名前が色の名前に当たる
			root.walkAtRules('apply', (rule) => check(rule.params, rule))
			return found
		},
	},

	'no-important': {
		messages: {
			important:
				'!important は書かない。第三者由来のインラインスタイルを打ち消すときだけ、.vue の <style> に書き、理由を添えた eslint-disable を <script> に置いて許す。',
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				if (decl.important) found.push({ node: decl, messageId: 'important' })
			})
			return found
		},
	},

	'no-reduced-motion': {
		messages: {
			reducedMotion: `prefers-reduced-motion で分岐しない。モーションの長さは用途ごとに1つ決める。 ${MOTION_URL}`,
		},
		find(root) {
			const found = []
			root.walkAtRules((rule) => {
				if (REDUCED_MOTION.test(rule.params))
					found.push({ node: rule, messageId: 'reducedMotion' })
			})
			return found
		},
	},

	'no-custom-breakpoint': {
		messages: {
			breakpoint: `{{literal}} で表示を出し分けない。ブレークポイントは ${BREAKPOINT_LABEL}の2つだけ。 ${BREAKPOINT_URL}`,
		},
		find(root) {
			const found = []
			root.walkAtRules('media', (rule) => {
				for (const [, condition] of rule.params.matchAll(MEDIA_CONDITION)) {
					if (!WIDTH_FEATURE.test(condition)) continue
					for (const [literal, number, unit] of condition.matchAll(MEDIA_LENGTH)) {
						if (breakpoints.pixels.has(toPixels(number, unit))) continue
						found.push({ node: rule, messageId: 'breakpoint', data: { literal } })
					}
				}
			})
			return found
		},
	},

	'no-web-font': {
		messages: {
			webFont: WEB_FONT_MESSAGE,
			import: '@import を書かない。引いた先の CSS を lint が読めず、@font-face の置き場になる。',
		},
		find(root) {
			const found = []
			root.walkAtRules((rule) => {
				const name = rule.name.toLowerCase()
				if (name === 'font-face') found.push({ node: rule, messageId: 'webFont' })
				// 引く先が外部でもリポジトリ内でも lint は読まないので、一律で落とす
				if (name === 'import') found.push({ node: rule, messageId: 'import' })
			})
			return found
		},
	},
	'no-theme-branch': {
		messages: {
			themeBranch: THEME_BRANCH_MESSAGE,
			colorScheme: COLOR_SCHEME_MESSAGE,
			themeClass: THEME_CLASS_MESSAGE,
		},
		find(root) {
			const found = []
			root.walkRules((rule) => {
				if (!THEME_SELECTOR.test(rule.selector)) return
				rule.walkDecls((decl) => {
					if (decl.prop.startsWith('--')) return
					found.push({ node: decl, messageId: 'themeBranch' })
				})
				// 同じく、テーマのクラスの下に置いた @apply も歩く
				rule.walkAtRules('apply', (at) =>
					found.push({ node: at, messageId: 'themeBranch' }),
				)
			})
			root.walkAtRules('media', (rule) => {
				if (COLOR_SCHEME.test(rule.params))
					found.push({ node: rule, messageId: 'colorScheme' })
			})
			// クラスの判定は template 側と同じものを使う
			root.walkAtRules('apply', (rule) => {
				if (THEME_CLASS.test(rule.params))
					found.push({ node: rule, messageId: 'themeClass' })
			})
			return found
		},
	},
}

const PLACEHOLDER = /\{\{(\w+)\}\}/g

// ESLint を通さない CSS の入口。位置と文面まで組み立てて、判定は CHECKS に残す
export function findings(root) {
	return Object.values(CHECKS)
		.flatMap((check) =>
			check.find(root).map(({ node, messageId, data = {} }) => ({
				line: node.source.start.line,
				column: node.source.start.column,
				message: check.messages[messageId].replace(PLACEHOLDER, (_, key) => data[key]),
			})),
		)
		.sort((a, b) => a.line - b.line || a.column - b.column)
}

const ruleOf = (check) => ({
	meta: { type: 'problem', schema: [], messages: check.messages },
	create(context) {
		return {
			Program() {
				eachStyleBlock(context, (root, locate) => {
					for (const { node, messageId, data } of check.find(root)) {
						context.report({ loc: locate(node), messageId, data })
					}
				})
			},
		}
	},
})

export default {
	rules: Object.fromEntries(Object.entries(CHECKS).map(([name, check]) => [name, ruleOf(check)])),
}
