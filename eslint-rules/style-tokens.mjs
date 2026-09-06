import postcss from 'postcss'
import resolveConfig from 'tailwindcss/resolveConfig.js'
import { sizes } from '../theme/tokens.ts'

export const DOCS_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs'
export const TOKEN_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#a-単一情報源`

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

// 語彙は tailwind.config.ts が解決した theme から作る。theme/tokens.ts に名前を足せば自動で通る
function buildVocabulary() {
	const theme = resolveConfig({ content: [], theme: { extend: { ...sizes } } }).theme
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
	const args = literal.slice(literal.indexOf('(') + 1)
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

export default {
	rules: {
		'no-untokenized-size': noUntokenizedSize,
		'no-color-literal': noColorLiteral,
	},
}
