import postcss from 'postcss'
import resolveConfig from 'tailwindcss/resolveConfig.js'
import { sizes } from '../theme/tokens.ts'

export const DOCS_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs'
export const TOKEN_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#a-単一情報源`
export const MOTION_URL = `${DOCS_URL}/adr/02-no-prefers-reduced-motion.md`
export const BREAKPOINT_URL = `${DOCS_URL}/adr/15-two-breakpoints.md`

export const WEB_FONT_MESSAGE =
	'Web フォントを読み込まない。表示速度が先。文字は theme/tokens.ts の fontFamily が並べるシステムフォントで組む。'

const IMPORT_MESSAGE =
	'<style> に @import を書かない。引いた先の CSS を lint が読めず、@font-face の置き場になる。'

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

// 文字列と url() の中身は値ではない。色はさらに、トークンの名前を色の名前と読まないよう落とす
const readable = (value) => value.replace(QUOTED, '').replace(URL_FUNCTION, '')

// CSS の色キーワード。transparent と currentColor は色の指定ではないので含めない
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

// ガイドラインが例外に挙げる「白・黒とその透過」
function isNeutral(literal) {
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

const noUntokenizedSize = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			untokenized: `{{literal}} は Tailwind のスケールにも theme/tokens.ts の sizes にも無い。sizes に名前を足すか、スケールの値で書く。 ${TOKEN_URL}`,
		},
	},
	create(context) {
		const check = (value, loc) => {
			for (const [literal, , number, unit] of readable(value).matchAll(LENGTH)) {
				if (vocabulary[unit.toLowerCase()].has(Math.abs(Number(number)))) continue
				context.report({ loc, messageId: 'untokenized', data: { literal } })
			}
		}

		return {
			Program() {
				eachStyleBlock(context, (root, locate) => {
					root.walkDecls((decl) => check(decl.value, locate(decl)))
					root.walkAtRules((rule) => check(rule.params, locate(rule)))
				})
			},
		}
	},
}

const noColorLiteral = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			literal: `色の直値（{{literal}}）は書かない。theme/tokens.ts に足して var(--color-*) で参照する。 ${TOKEN_URL}`,
		},
	},
	create(context) {
		const check = (value, loc) => {
			const text = readable(value).replace(CUSTOM_PROPERTY, '')
			const found = [
				...text.matchAll(HEX),
				...text.matchAll(COLOR_FUNCTION),
				...[...text.matchAll(/\b[a-z]+\b(?!\s*\()/gi)].filter((match) =>
					NAMED_COLORS.has(match[0].toLowerCase()),
				),
			]
			for (const [literal] of found) {
				// var() を含む関数はトークン由来（Callout の --callout-rgb）
				if (literal.includes('var(') || isNeutral(literal)) continue
				context.report({ loc, messageId: 'literal', data: { literal } })
			}
		}

		return {
			Program() {
				eachStyleBlock(context, (root, locate) => {
					root.walkDecls((decl) => check(decl.value, locate(decl)))
				})
			},
		}
	},
}

const noImportant = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			important:
				'!important は書かない。第三者由来のインラインスタイルを打ち消すときだけ、理由を添えた eslint-disable を <script> に置いて許す。',
		},
	},
	create(context) {
		return {
			Program() {
				eachStyleBlock(context, (root, locate) => {
					root.walkDecls((decl) => {
						if (decl.important)
							context.report({ loc: locate(decl), messageId: 'important' })
					})
				})
			},
		}
	},
}

const REDUCED_MOTION = /prefers-reduced-motion/i

const noReducedMotion = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			reducedMotion: `prefers-reduced-motion で分岐しない。モーションの長さは用途ごとに1つ決める。 ${MOTION_URL}`,
		},
	},
	create(context) {
		return {
			Program() {
				eachStyleBlock(context, (root, locate) => {
					root.walkAtRules((rule) => {
						if (REDUCED_MOTION.test(rule.params))
							context.report({ loc: locate(rule), messageId: 'reducedMotion' })
					})
				})
			},
		}
	},
}

const MEDIA_CONDITION = /\(([^()]*)\)/g
const WIDTH_FEATURE = /\bwidth\b/i

const noCustomBreakpoint = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			breakpoint: `{{literal}} で表示を出し分けない。ブレークポイントは ${BREAKPOINT_LABEL}の2つだけ。 ${BREAKPOINT_URL}`,
		},
	},
	create(context) {
		return {
			Program() {
				eachStyleBlock(context, (root, locate) => {
					root.walkAtRules('media', (rule) => {
						for (const [, condition] of rule.params.matchAll(MEDIA_CONDITION)) {
							if (!WIDTH_FEATURE.test(condition)) continue
							for (const [literal, number, unit] of condition.matchAll(
								MEDIA_LENGTH,
							)) {
								if (breakpoints.pixels.has(toPixels(number, unit))) continue
								context.report({
									loc: locate(rule),
									messageId: 'breakpoint',
									data: { literal },
								})
							}
						}
					})
				})
			},
		}
	},
}

const noWebFont = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			webFont: WEB_FONT_MESSAGE,
			import: IMPORT_MESSAGE,
		},
	},
	create(context) {
		return {
			Program() {
				eachStyleBlock(context, (root, locate) => {
					root.walkAtRules((rule) => {
						if (rule.name === 'font-face')
							context.report({ loc: locate(rule), messageId: 'webFont' })
						// 引く先が外部でもリポジトリ内でも lint は読まないので、一律で落とす
						if (rule.name === 'import')
							context.report({ loc: locate(rule), messageId: 'import' })
					})
				})
			},
		}
	},
}

export default {
	rules: {
		'no-untokenized-size': noUntokenizedSize,
		'no-color-literal': noColorLiteral,
		'no-important': noImportant,
		'no-reduced-motion': noReducedMotion,
		'no-custom-breakpoint': noCustomBreakpoint,
		'no-web-font': noWebFont,
	},
}
