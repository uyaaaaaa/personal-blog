import postcss from 'postcss'
import resolveConfig from 'tailwindcss/resolveConfig.js'
import {
	durations,
	fontFamily,
	fontSize,
	motionProperties,
	screens,
	sizes,
	toTailwindColors,
} from '../theme/tokens.ts'

export const DOCS_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs'
export const TOKEN_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#原則`
export const BREAKPOINT_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#原則`
export const INVARIANT_URL = `${DOCS_URL}/ARCHITECTURE.md#不変条件`

// 抑制が届く先は eslint-disable を書いた場所より下だけ。テンプレートは <script> より上にあり、.css は ESLint が読まない
export const STYLE_EXCEPTION =
	'例外は .vue の <style> に書き、理由を添えた eslint-disable を <script> に置く。テンプレートと .css には eslint-disable が届かない。'

export const WEB_FONT_MESSAGE =
	'Web フォントを読み込まない。表示速度が先。文字は theme/tokens.ts の fontFamily が並べるシステムフォントで組む。'

const FONT_FILE = '\\.(?:woff2?|otf|ttf|eot)\\b'
const FONT_HOST = '\\b(?:(?:fontsource|fonts?)(?:[./]|$)|(?:typeface|typekit)[./-])'
export const WEB_FONT_RESOURCE = `(?:${FONT_FILE}|${FONT_HOST})`

export const THEME_BRANCH_MESSAGE =
	'テーマごとに宣言を分岐しない。差は theme/tokens.ts の darkColors が作る。.dark と .light に書けるのはカスタムプロパティの再定義だけ。'

export const COLOR_SCHEME_MESSAGE =
	'prefers-color-scheme で分岐しない。テーマを持つのは .dark / .light クラスで、色の差は theme/tokens.ts の darkColors が作る。'

export const THEME_CLASS_MESSAGE =
	'dark: で色を分岐しない。テーマの差は theme/tokens.ts の darkColors が作る。dark: を書くのはテーマで DOM を出し分けるときだけ。'

export const DISPLAY_NONE_MESSAGE =
	'display: none を宣言に書かない。表示・非表示の切り替えは template のクラス（hidden / md:block）か v-show で行う。クラスを付けられない UA の擬似要素は、それを作らない要素に変えて出させない。'

export const SCROLL_BEHAVIOR_MESSAGE = `scroll-behavior は宣言しない。ページ遷移とブラウザバックの位置復元までアニメーションする。滑らかに送るのは useScrollTo が呼び出しごとに指定する。 ${INVARIANT_URL}`

// overscroll-behavior / overscroll-contain と綴りが重なるので、前が区切りか終端のものだけを見る
const SCROLL_BEHAVIOR_PROPERTY = '(?<![a-z-])scroll-behavior'
export const SCROLL_BEHAVIOR_CLASS = '(?:^|[\\s:])(?:[a-z-]+:)*!?scroll-(?:smooth|auto)(?![a-z-])'

export const OUTLINE_REMOVAL_MESSAGE = `フォーカスの輪郭を消さない。キーボードのフォーカス位置は常に見える。同じ要素に別の見える指標があるときだけ許す。${STYLE_EXCEPTION}`

// outline-offset-0 と綴りが重なるので、後ろが区切りか終端のものだけを見る
export const OUTLINE_REMOVAL_CLASS =
	'(?:^|[\\s:])(?:[a-z-]+:)*!?outline-(?:none|0|transparent)(?![\\w-])'
// 値の語の区切り。`0.5rem` の 0 と `#0ff` の 0 は語の一部で、値ではない
const WORD_EDGE = '[\\w.%#-]'
const OUTLINE_REMOVAL_VALUE = `(?<!${WORD_EDGE})(?:none|0[a-z%]*|transparent)(?!${WORD_EDGE})(?![^()]*\\))`
// 初期値が none なのは outline-style だけなので、消えるのは一括指定と outline-style と all
const OUTLINE_RESET_VALUE = `(?<!${WORD_EDGE})(?:unset|initial)(?!${WORD_EDGE})(?![^()]*\\))`
// 色を取る接頭辞。末尾の名前だけで見ると box-border や align-sub まで当たる
const COLOR_PREFIX =
	'text|bg|border|divide|outline|ring|ring-offset|shadow|accent|caret|decoration|fill|stroke|placeholder|from|via|to'
const COLOR_NAME = Object.keys(toTailwindColors()).join('|')
// dark: の後ろにも variant が続く。辺を指す指定（border-t）は1文字。prose-invert は本文の色を丸ごと差し替える
export const THEME_COLOR_CLASS = `(?:^|[\\s:])dark:(?:[a-z-]+:)*!?(?:(?:${COLOR_PREFIX})(?:-[a-z])?-(?:${COLOR_NAME})|prose-invert)(?![a-z-])`

// 長さの語彙を持つ theme のセクション。ここに無いもの（blur・boxShadow 等）は語彙に数えない
const LENGTH_SECTIONS = [
	'spacing',
	'fontSize',
	'lineHeight',
	'letterSpacing',
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

// 左端は TIME と同じく閉じる。閉じないと drift-2em や --panel-2em の尻尾が長さになる
const LENGTH = /(?<![\w.-])(-?)(\d*\.?\d+)(px|r?em)\b/gi
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

const FONT_KEYWORDS = new Set(
	'inherit initial unset revert revert-layer var normal italic oblique small-caps bold bolder lighter ultra-condensed extra-condensed condensed semi-condensed semi-expanded expanded extra-expanded ultra-expanded xx-small x-small small medium large x-large xx-large xxx-large larger smaller'.split(
		' ',
	),
)

const FONT_PROPERTY = /^font(?:-family)?$/i
const FONT_SIZE_PROPERTY = /^font(?:-size)?$/i
const PX_TEXT_CLASS = /(?<![\w-])text-\[(?:length:)?-?\d*\.?\d+px\]/gi
// 引用符で囲った名前と、区切りから始まる語。数に続く単位（1.5rem の rem）は語ではない
const FONT_WORD = /'[^']*'|"[^"]*"|(?<![\w-])-?[a-zA-Z][\w-]*/g

// カンマで割った family ごとに、キーワードでない語だけを名前として返す
function fontLiterals(value) {
	const found = []
	for (const family of value.replace(CUSTOM_PROPERTY, '').split(',')) {
		const literals = [...family.matchAll(FONT_WORD)]
			.map(([word]) => word)
			.filter((word) => !FONT_KEYWORDS.has(word.toLowerCase()))
		if (literals.length > 0) found.push(literals.join(' '))
	}
	return found
}

function collectStrings(value, into) {
	if (typeof value === 'string') into.add(value)
	else if (Array.isArray(value)) for (const item of value) collectStrings(item, into)
	else if (value && typeof value === 'object')
		for (const item of Object.values(value)) collectStrings(item, into)
}

// tailwind.config.ts 自体は node が型注釈を落とせず読めないため、ここで組み直す
const theme = resolveConfig({
	content: [],
	theme: { screens, fontSize, extend: { ...sizes } },
}).theme

// 語彙は Tailwind の既定の theme に tokens を重ねて作る。sizes か fontSize に名前を足せば通る
function buildVocabulary() {
	const strings = new Set()
	for (const section of LENGTH_SECTIONS) collectStrings(theme[section], strings)
	collectStrings(sizes, strings)

	const vocabulary = { px: new Set(), rem: new Set(), em: new Set() }
	for (const string of strings) {
		for (const [, , number, unit] of string.matchAll(LENGTH)) {
			vocabulary[unit.toLowerCase()].add(Number(number))
		}
	}
	return vocabulary
}

const vocabulary = buildVocabulary()

const MEDIA_AT_RULE = /^media$/i
const MEDIA_LENGTH = /(\d*\.?\d+)([a-z]+)\b/gi
// メディアクエリの em は初期フォントサイズが基準なので rem と同じ
const PIXELS_PER = { px: 1, rem: 16, em: 16 }

const toPixels = (number, unit) => Number(number) * PIXELS_PER[unit.toLowerCase()]

function buildBreakpoints() {
	const pixels = new Set()
	const labels = []
	for (const [name, width] of Object.entries(theme.screens)) {
		const value = String(width)
		const [[, number, unit]] = value.matchAll(MEDIA_LENGTH)
		pixels.add(toPixels(number, unit))
		labels.push(`${name}（${value}）`)
	}
	return { pixels, label: labels.join('と ') }
}

const breakpoints = buildBreakpoints()

export const BREAKPOINT_LABEL = breakpoints.label

const BREAKPOINT_WIDTHS = [...breakpoints.pixels].flatMap((px) =>
	Object.entries(PIXELS_PER).map(([unit, scale]) => `${px / scale}${unit}`),
)

const WIDTHS = BREAKPOINT_WIDTHS.join('|')
// 宣言（max-width: 36rem）と混ざらないよう、括弧から見る
const WIDTH_BY_LENGTH = `\\((?=[^()]*width)[^()]*?(?<![\\d.])(?!(?:${WIDTHS})\\b)\\d*\\.?\\d+[a-z%]+`
// 組み立てた文字列は長さが別のリテラルに出るので、綴りからも見る
const WIDTH_BY_SPELLING = `\\((?:min|max)-width\\s*:(?!\\s*(?:${WIDTHS})\\s*\\))`
const BREAKPOINT_MEDIA = `(?:${WIDTH_BY_SPELLING}|${WIDTH_BY_LENGTH})`

// tokens の fontFamily が theme を上書きするので、残るのは Tailwind の既定の family だけ
const OFF_TOKEN_FONTS = Object.keys(theme.fontFamily).filter((name) => !(name in fontFamily))

export const FONT_CLASS_MESSAGE = `${OFF_TOKEN_FONTS.map((name) => `font-${name}`).join(' / ')} は使わない。文字は theme/tokens.ts の fontFamily が持つ名前のクラスで書く。 ${TOKEN_URL}`

export const OFF_TOKEN_FONT_CLASS = `(?:^|[\\s:])(?:[a-z-]+:)*!?font-(?:${OFF_TOKEN_FONTS.join('|')})(?![\\w-])`

// 上向きの variant は screens が閉じているが、max-* は screens から自動で生えるので閉じられない
export const MAX_WIDTH_VARIANTS = Object.keys(theme.screens).map((name) => `max-${name}`)

const TIME = /(?<![\w.-])(\d*\.?\d+)(m?s)(?![\w-])/gi

const toMilliseconds = (number, unit) => Number(number) * (unit.toLowerCase() === 's' ? 1000 : 1)

const millisecondsOf = (value) => {
	const [[, number, unit]] = value.matchAll(TIME)
	return toMilliseconds(number, unit)
}

// 用途ごとの長さ。綴りが違っても同じ長さ（0.2s と 200ms）は同じものとして見る
const DURATION = Object.fromEntries(
	Object.entries(durations).map(([purpose, value]) => [purpose, millisecondsOf(value)]),
)
const DECIDED = new Set(Object.values(DURATION))

const DURATION_LABEL = Object.entries(durations)
	.map(([purpose, value]) => `${purpose} は ${value}`)
	.join('、')

const COLOR_PROPERTY = new RegExp(`^(?:${motionProperties.color.join('|')})$|-color$`, 'i')

const purposeOf = (property) => (COLOR_PROPERTY.test(property) ? 'color' : 'move')

// 短縮形は対象・長さ・遅延・緩急を順不同で持つ。緩急の語と関数を外した最初の語が対象になる
const TIMING_WORDS = new Set(
	'ease ease-in ease-out ease-in-out linear step-start step-end normal allow-discrete inherit initial unset revert revert-layer'.split(
		' ',
	),
)
// 関数は名前ごと外す。中の語（steps(4, end) の end）は対象の名前ではない
const FUNCTION_CALL = /[\w-]*\([^()]*\)/g
const SEGMENT_WORD = /(?<![\w.-])(?:--[\w-]+|[a-zA-Z][\w-]*)/g

// 対象を書かない短縮形は all と同じ
const ALL = 'all'

function propertyOf(segment) {
	for (const [word] of segment.replace(FUNCTION_CALL, ' ').matchAll(SEGMENT_WORD)) {
		if (TIMING_WORDS.has(word.toLowerCase())) continue
		return word.toLowerCase()
	}
	return ALL
}

// 緩急の関数（cubic-bezier(0.4, 0, 0.2, 1)）が持つカンマと混ざらないよう、括弧の外だけで割る
function segmentsOf(value) {
	const segments = ['']
	let depth = 0
	for (const character of value) {
		if (character === '(') depth += 1
		else if (character === ')') depth -= 1
		else if (character === ',' && depth === 0) {
			segments.push('')
			continue
		}
		segments[segments.length - 1] += character
	}
	return segments
}

// カスタムプロパティは var() で長さとして参照されるので、モーションの宣言と同じ判定で見る
const MOTION_PROPERTY = /^(?:(?:transition|animation)(?:-[\w-]+)?|--[\w-]+)$/i
const TRANSITION_TARGET = /^transition(?:-property)?$/i

// 宣言1つ分の指摘。置き場所は呼ぶ側が足す
function motionFindings(property, value) {
	const found = []
	if (TRANSITION_TARGET.test(property)) {
		for (const segment of segmentsOf(value)) {
			const target = propertyOf(segment)
			if (target === ALL) {
				found.push({ messageId: 'mixed' })
				continue
			}
			const purpose = purposeOf(target)
			for (const [literal, number, unit] of segment.matchAll(TIME)) {
				// 0 は動かさない指定なので、どの用途でも通す
				const milliseconds = toMilliseconds(number, unit)
				if (milliseconds === 0 || milliseconds === DURATION[purpose]) continue
				const data = { literal, property: target, expected: durations[purpose], purpose }
				found.push({ messageId: 'offPurpose', data })
			}
		}
		return found
	}
	if (!MOTION_PROPERTY.test(property)) return found

	// 対象が別の宣言にあるので用途は決まらない。決めた長さのどれかであることだけを見る
	for (const [literal, number, unit] of value.matchAll(TIME)) {
		const milliseconds = toMilliseconds(number, unit)
		if (milliseconds === 0 || DECIDED.has(milliseconds)) continue
		found.push({ messageId: 'anyPurpose', data: { literal } })
	}
	return found
}

const MOTION_DECLARATION = /^(?:transition|animation)(?:-[\w-]+)?$/i
const MOTION_CLASS = '(?:transition|duration|delay|animate)(?![\\w])'
const IMPORTANT_MOTION_CLASS = new RegExp(`(?:^|[\\s:])(?:[a-z-]+:)*!${MOTION_CLASS}`)
const IMPORTANT_MOTION_TEXT = /(?:transition|animation)[\w-]*\s*:([^;]*)!\s*important/gi

const MOTION_KEY = /^(?:transition|animation)(?:-?[\w-]+)?$/i

const keepsMotion = (value) =>
	/var\(/i.test(value) ||
	[...value.matchAll(TIME)].some(([, number, unit]) => toMilliseconds(number, unit) !== 0)

const importantMotionIn = (text) =>
	IMPORTANT_MOTION_CLASS.test(text) ||
	[...text.matchAll(IMPORTANT_MOTION_TEXT)].some(([, value]) => keepsMotion(value))
// @apply の末尾の !important は、並べたクラス全部に掛かる
const IMPORTANT_APPLY = new RegExp(`(?:^|[\\s:])${MOTION_CLASS}[\\s\\S]*!important\\s*$`)

const MOTION_PURPOSES = Object.keys(durations).join('|')
const MOTION_CLASSES = Object.keys(durations).map((purpose) => `transition-${purpose}`)
// 長さを別に書くクラスの接頭辞
const LENGTH_CLASSES = ['duration', 'delay', 'animate']

const MOTION_CLASS_MESSAGE = `モーションのクラスは用途の名前で書く（${MOTION_CLASSES.join(' / ')}）。長さは用途のクラスが持つので、長さを別に書くクラス（${LENGTH_CLASSES.map((name) => `${name}-`).join(' / ')}）は無い。`

const OFF_PURPOSE_MOTION = new RegExp(
	`(?:^|[\\s:])(?:[a-z-]+:)*!?(?:transition(?!-(?:${MOTION_PURPOSES})(?![\\w-]))|(?:${LENGTH_CLASSES.join('|')})-)`,
)

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

// メディアクエリの em は初期フォントサイズが基準なので rem として引く
function untokenizedLengths(value, inMedia) {
	const found = []
	for (const [literal, , number, unit] of stripNonValues(value).matchAll(LENGTH)) {
		const spelled = unit.toLowerCase()
		const section = inMedia && spelled === 'em' ? 'rem' : spelled
		if (!vocabulary[section].has(Math.abs(Number(number)))) found.push(literal)
	}
	return found
}

function colorLiterals(value) {
	const text = stripNonValues(value).replace(CUSTOM_PROPERTY, '')
	const matches = [
		...text.matchAll(HEX),
		...text.matchAll(COLOR_FUNCTION),
		...[...text.matchAll(/\b[a-z]+\b(?!\s*\()/gi)].filter((match) =>
			NAMED_COLORS.has(match[0].toLowerCase()),
		),
	]
	// var() を含む関数はトークン由来（Callout の --callout-rgb）
	return matches
		.map(([literal]) => literal)
		.filter((literal) => !literal.includes('var(') && !isWhiteOrBlack(literal))
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

const MEDIA_CONDITION = /\(([^()]*)\)/g
const WIDTH_FEATURE = /\bwidth\b/i
// colorMode の classSuffix が空なので、テーマは html の .dark / .light に出る
const THEME_SELECTOR = /\.(?:dark|light)(?![\w-])/
const COLOR_SCHEME = /prefers-color-scheme/i
const THEME_CLASS = new RegExp(THEME_COLOR_CLASS)
const SCROLL_BEHAVIOR = new RegExp(SCROLL_BEHAVIOR_CLASS)
const DISPLAY_PROPERTY = /^display$/i
// display が消すのは none のときだけ。flex と grid は並べ方で、出し分けではない
const HIDDEN_DISPLAY = /(?<![\w-])none(?![\w-])/i
// @apply hidden も宣言に開くと display: none になる。variant が前に付く
const HIDDEN_CLASS = /(?:^|[\s:])(?:[a-z-]+:)*!?hidden(?![\w-])/
const OUTLINE_PROPERTY = /^outline(?:-(?:style|width|color))?$/i
const OUTLINE_RESET_PROPERTY = /^(?:all|outline(?:-style)?)$/i
const NO_OUTLINE_VALUE = new RegExp(OUTLINE_REMOVAL_VALUE, 'i')
const RESET_OUTLINE_VALUE = new RegExp(OUTLINE_RESET_VALUE, 'i')
const OUTLINE_REMOVAL = new RegExp(OUTLINE_REMOVAL_CLASS)
const OFF_TOKEN_FONT = new RegExp(OFF_TOKEN_FONT_CLASS)

const SCRIPT_SPELLING = {
	'no-scroll-behavior': `${SCROLL_BEHAVIOR_PROPERTY}|${SCROLL_BEHAVIOR_CLASS}`,
	'no-theme-branch': COLOR_SCHEME.source,
	'no-web-font': WEB_FONT_RESOURCE,
	'no-custom-breakpoint': BREAKPOINT_MEDIA,
}

export const scriptSpellingSelector = (name) =>
	`:matches(Literal[value=/${SCRIPT_SPELLING[name]}/i], TemplateElement[value.cooked=/${SCRIPT_SPELLING[name]}/i])`

// 判定の正本。<style> は ESLint のルールとして、.css は scripts/check-css.mjs から同じものを使う
const CHECKS = {
	'no-untokenized-size': {
		messages: {
			untokenized: `{{literal}} は Tailwind のスケールにも theme/tokens.ts の sizes / fontSize にも無い。どちらかに名前を足すか、スケールの値で書く。 ${TOKEN_URL}`,
		},
		find(root) {
			const found = []
			const check = (value, node, inMedia) => {
				for (const literal of untokenizedLengths(value, inMedia))
					found.push({ node, messageId: 'untokenized', data: { literal } })
			}
			root.walkDecls((decl) => check(decl.value, decl, false))
			// em の基準が変わるのは @media だけ。@apply の任意値は宣言と同じ基準で引く
			root.walkAtRules((rule) => check(rule.params, rule, MEDIA_AT_RULE.test(rule.name)))
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
				for (const literal of colorLiterals(value))
					found.push({ node, messageId: 'literal', data: { literal } })
			}
			root.walkDecls((decl) => check(decl.value, decl))
			// postcss の walkDecls は at-rule を見ないので、@apply だけ別に歩く
			root.walkAtRules('apply', (rule) => check(rule.params, rule))
			return found
		},
	},

	'no-font-literal': {
		messages: {
			literal: `書体の名前（{{literal}}）は書かない。文字は theme/tokens.ts の fontFamily が並べるものだけで組み、var(--font-*) で参照する。 ${TOKEN_URL}`,
			fontClass: FONT_CLASS_MESSAGE,
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				if (!FONT_PROPERTY.test(decl.prop)) return
				for (const literal of fontLiterals(decl.value))
					found.push({ node: decl, messageId: 'literal', data: { literal } })
			})
			root.walkAtRules('apply', (rule) => {
				if (OFF_TOKEN_FONT.test(rule.params))
					found.push({ node: rule, messageId: 'fontClass' })
			})
			return found
		},
	},

	'no-px-font-size': {
		messages: {
			px: `文字サイズ（{{literal}}）を px で書かない。利用者が変えた文字サイズに追従するよう rem か em で書く。 ${TOKEN_URL}`,
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				if (!FONT_SIZE_PROPERTY.test(decl.prop)) return
				// 略記の / の後ろは行の高さ
				const [size] = decl.value.split('/')
				for (const [literal, , , unit] of stripNonValues(size).matchAll(LENGTH)) {
					if (unit.toLowerCase() === 'px')
						found.push({ node: decl, messageId: 'px', data: { literal } })
				}
			})
			root.walkAtRules('apply', (rule) => {
				for (const [literal] of rule.params.matchAll(PX_TEXT_CLASS))
					found.push({ node: rule, messageId: 'px', data: { literal } })
			})
			return found
		},
	},

	'no-important': {
		messages: {
			important: `!important は書かない。第三者由来のインラインスタイルを打ち消すときだけ許す。${STYLE_EXCEPTION}`,
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				if (decl.important) found.push({ node: decl, messageId: 'important' })
			})
			return found
		},
	},

	'no-off-purpose-motion': {
		messages: {
			offPurpose:
				'{{literal}} は {{property}} に決めた長さではない。{{property}} は {{expected}}（theme/tokens.ts の durations.{{purpose}}）で書く。',
			mixed: 'transition の対象に all を書かない。用途ごとに長さが変わるので、動かすプロパティを挙げる。',
			anyPurpose: `{{literal}} は決めた長さではない。モーションの長さは theme/tokens.ts の durations が用途ごとに1つ持つ（${DURATION_LABEL}）。`,
			motionClass: MOTION_CLASS_MESSAGE,
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				for (const one of motionFindings(decl.prop, decl.value))
					found.push({ node: decl, ...one })
			})
			root.walkAtRules('apply', (rule) => {
				if (OFF_PURPOSE_MOTION.test(rule.params))
					found.push({ node: rule, messageId: 'motionClass' })
			})
			return found
		},
	},

	'no-motion-important': {
		messages: {
			important:
				'モーションの宣言に !important を付けない。動きを減らす設定より強くなり、設定しても止まらなくなる。抑制でも通さない。',
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				if (decl.important && MOTION_DECLARATION.test(decl.prop) && keepsMotion(decl.value))
					found.push({ node: decl, messageId: 'important' })
			})
			root.walkAtRules('apply', (rule) => {
				if (IMPORTANT_MOTION_CLASS.test(rule.params) || IMPORTANT_APPLY.test(rule.params))
					found.push({ node: rule, messageId: 'important' })
			})
			return found
		},
		script: (context) => ({
			'Literal, TemplateElement'(node) {
				const value = node.type === 'Literal' ? node.value : node.value.cooked
				if (typeof value === 'string' && importantMotionIn(value))
					context.report({ node, messageId: 'important' })
			},
			"ExportDefaultDeclaration > ObjectExpression > Property[key.name='important'][value.value=true], ExportDefaultDeclaration > * > ObjectExpression > Property[key.name='important'][value.value=true]"(
				node,
			) {
				context.report({ node, messageId: 'important' })
			},
			Property(node) {
				const key = node.key.name ?? node.key.value
				const { value } = node.value
				if (
					typeof key === 'string' &&
					MOTION_KEY.test(key) &&
					typeof value === 'string' &&
					/!\s*important/i.test(value) &&
					keepsMotion(value)
				)
					context.report({ node, messageId: 'important' })
			},
			// el.style の !important はインラインなので、全称セレクタの !important より強い
			"CallExpression[callee.property.name='setProperty']"(node) {
				const [property, value, priority] = node.arguments
				if (
					MOTION_DECLARATION.test(property?.value ?? '') &&
					priority?.value === 'important' &&
					(typeof value?.value !== 'string' || keepsMotion(value.value))
				)
					context.report({ node, messageId: 'important' })
			},
		}),
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

	'no-outline-removal': {
		messages: {
			outlineRemoval: OUTLINE_REMOVAL_MESSAGE,
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				const removes =
					(OUTLINE_PROPERTY.test(decl.prop) && NO_OUTLINE_VALUE.test(decl.value)) ||
					(OUTLINE_RESET_PROPERTY.test(decl.prop) && RESET_OUTLINE_VALUE.test(decl.value))
				if (removes) found.push({ node: decl, messageId: 'outlineRemoval' })
			})
			root.walkAtRules('apply', (rule) => {
				if (OUTLINE_REMOVAL.test(rule.params))
					found.push({ node: rule, messageId: 'outlineRemoval' })
			})
			return found
		},
	},

	'no-display-none': {
		messages: {
			displayNone: DISPLAY_NONE_MESSAGE,
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				if (DISPLAY_PROPERTY.test(decl.prop) && HIDDEN_DISPLAY.test(decl.value))
					found.push({ node: decl, messageId: 'displayNone' })
			})
			root.walkAtRules('apply', (rule) => {
				if (HIDDEN_CLASS.test(rule.params))
					found.push({ node: rule, messageId: 'displayNone' })
			})
			return found
		},
	},

	'no-scroll-behavior': {
		messages: {
			scrollBehavior: SCROLL_BEHAVIOR_MESSAGE,
		},
		find(root) {
			const found = []
			root.walkDecls((decl) => {
				if (decl.prop.toLowerCase() === 'scroll-behavior')
					found.push({ node: decl, messageId: 'scrollBehavior' })
			})
			root.walkAtRules('apply', (rule) => {
				if (SCROLL_BEHAVIOR.test(rule.params))
					found.push({ node: rule, messageId: 'scrollBehavior' })
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
	create: (context) => ({
		...check.script?.(context),
		Program() {
			eachStyleBlock(context, (root, locate) => {
				for (const { node, messageId, data } of check.find(root)) {
					context.report({ loc: locate(node), messageId, data })
				}
			})
		},
	}),
})

export default {
	rules: Object.fromEntries(Object.entries(CHECKS).map(([name, check]) => [name, ruleOf(check)])),
}
