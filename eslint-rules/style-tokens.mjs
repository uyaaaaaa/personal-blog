import postcss from 'postcss'
import resolveConfig from 'tailwindcss/resolveConfig.js'
import { colors, fontFamily, sizes } from '../theme/tokens.ts'

export const DOCS_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs'
export const TOKEN_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#a-単一情報源`
export const MOTION_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#原則`
export const BREAKPOINT_URL = `${DOCS_URL}/DESIGN_GUIDELINE.md#原則`
export const INVARIANT_URL = `${DOCS_URL}/ARCHITECTURE.md#不変条件`

// 抑制が届く先は eslint-disable を書いた場所より下だけ。テンプレートは <script> より上にあり、.css は ESLint が読まない
export const STYLE_EXCEPTION =
	'例外は .vue の <style> に書き、理由を添えた eslint-disable を <script> に置く。テンプレートと .css には eslint-disable が届かない。'

export const WEB_FONT_MESSAGE =
	'Web フォントを読み込まない。表示速度が先。文字は theme/tokens.ts の fontFamily が並べるシステムフォントで組む。'

// フォントの実体と、フォントを配る先。`font-mono` 等のクラス名と混ざらないよう、
// 綴りの後ろが区切りか終端のものだけを見る（`typeface-roboto` があるので `-` はその2語だけ）
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
export const SCROLL_BEHAVIOR_PROPERTY = '(?<![a-z-])scroll-behavior'
export const SCROLL_BEHAVIOR_CLASS = '(?:^|[\\s:])(?:[a-z-]+:)*!?scroll-(?:smooth|auto)(?![a-z-])'

export const OUTLINE_REMOVAL_MESSAGE = `フォーカスの輪郭を消さない。キーボードのフォーカス位置は常に見える。同じ要素に別の見える指標があるときだけ許す。${STYLE_EXCEPTION}`

// outline-offset-0 と綴りが重なるので、後ろが区切りか終端のものだけを見る
export const OUTLINE_REMOVAL_CLASS =
	'(?:^|[\\s:])(?:[a-z-]+:)*!?outline-(?:none|0|transparent)(?![\\w-])'
// 値の語の区切り。`0.5rem` の 0 と `#0ff` の 0 は語の一部で、値ではない
const WORD_EDGE = '[\\w.%#-]'
// 輪郭が消える値。線を持たない語か透明な色が1つでも入る。
// 関数の中（`rgb(0 0 0)`）は色の一部なので数えない
export const OUTLINE_REMOVAL_VALUE = `(?<!${WORD_EDGE})(?:none|0[a-z%]*|transparent)(?!${WORD_EDGE})(?![^()]*\\))`
// 初期値に戻す語。初期値が none なのは outline-style なので、輪郭が消えるのは
// 一括指定と outline-style と all のときだけ（outline-color は色、outline-width は medium に戻る）
export const OUTLINE_RESET_VALUE = `(?<!${WORD_EDGE})(?:unset|initial)(?!${WORD_EDGE})(?![^()]*\\))`
// カスタムプロパティ（--outline）と綴りが重なるので、前が区切りか終端のものだけを見る
export const OUTLINE_REMOVAL_PROPERTY = [
	`(?<![\\w-])outline(?:-(?:style|width|color))?\\s*:[^;]*${OUTLINE_REMOVAL_VALUE}`,
	`(?<![\\w-])(?:all|outline(?:-style)?)\\s*:[^;]*${OUTLINE_RESET_VALUE}`,
].join('|')

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

// 書体の名前でない語。font の一括指定が family の前に並べる語と、値を持たない CSS 全体のキーワード。
// システムフォントの語（menu 等）は、トークンを通らない書体の指定なので入れない
const FONT_KEYWORDS = new Set(
	'inherit initial unset revert revert-layer var normal italic oblique small-caps bold bolder lighter ultra-condensed extra-condensed condensed semi-condensed semi-expanded expanded extra-expanded ultra-expanded xx-small x-small small medium large x-large xx-large xxx-large larger smaller'.split(
		' ',
	),
)

const FONT_PROPERTY = /^font(?:-family)?$/i
// style 属性は宣言の並びなので、綴りから font の宣言を取り出す
const FONT_DECLARATION = /(?<![\w-])font(?:-family)?\s*:([^;]*)/gi
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

const BREAKPOINT_WIDTHS = [...breakpoints.pixels].flatMap((px) =>
	Object.entries(PIXELS_PER).map(([unit, scale]) => `${px / scale}${unit}`),
)

const WIDTHS = BREAKPOINT_WIDTHS.join('|')
// 宣言（max-width: 36rem）と混ざらないよう、括弧から見る
const WIDTH_BY_LENGTH = `\\((?=[^()]*width)[^()]*?(?<![\\d.])(?!(?:${WIDTHS})\\b)\\d*\\.?\\d+[a-z%]+`
// 組み立てた文字列は長さが別のリテラルに出るので、綴りからも見る
const WIDTH_BY_SPELLING = `\\((?:min|max)-width\\s*:(?!\\s*(?:${WIDTHS})\\s*\\))`
export const BREAKPOINT_MEDIA = `(?:${WIDTH_BY_SPELLING}|${WIDTH_BY_LENGTH})`

// tokens の fontFamily が theme を上書きするので、残るのは Tailwind の既定の family だけ
const OFF_TOKEN_FONTS = Object.keys(theme.fontFamily).filter((name) => !(name in fontFamily))

export const FONT_CLASS_MESSAGE = `${OFF_TOKEN_FONTS.map((name) => `font-${name}`).join(' / ')} は使わない。文字は theme/tokens.ts の fontFamily が持つ名前のクラスで書く。 ${TOKEN_URL}`

export const OFF_TOKEN_FONT_CLASS = `(?:^|[\\s:])(?:[a-z-]+:)*!?font-(?:${OFF_TOKEN_FONTS.join('|')})(?![\\w-])`

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

function untokenizedLengths(value) {
	const found = []
	for (const [literal, , number, unit] of stripNonValues(value).matchAll(LENGTH)) {
		if (!vocabulary[unit.toLowerCase()].has(Math.abs(Number(number)))) found.push(literal)
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

function* elements(node) {
	if (node.type !== 'VElement') return
	yield node
	for (const child of node.children) yield* elements(child)
}

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

function propertyName(property) {
	if (property.type !== 'Property') return null
	if (property.key.type === 'Identifier' && !property.computed) return kebab(property.key.name)
	if (property.key.type === 'Literal' && typeof property.key.value === 'string')
		return kebab(property.key.value)
	return null
}

// :style は宣言そのものを持たないので、キーと文字列から宣言を組み直す。
// 辿るのはどの枝も値になる形だけ。呼び出しの引数・添字・比較の被演算子は値ではない
function* declarations(node, property = '') {
	if (!node || typeof node.type !== 'string') return
	const declare = (text) => (property ? `${property}: ${text}` : text)
	switch (node.type) {
		case 'ObjectExpression':
			for (const entry of node.properties) {
				// 名乗らないキー（[key] や ...styles）の値も、綴りを持たない値として読む
				const target = entry.type === 'SpreadElement' ? entry.argument : entry.value
				yield* declarations(target, propertyName(entry) ?? '')
			}
			return
		case 'Literal':
			if (typeof node.value === 'string') yield { text: declare(node.value), node }
			return
		case 'TemplateLiteral':
			for (const quasi of node.quasis)
				yield { text: declare(quasi.value.cooked), node: quasi }
			return
		case 'ArrayExpression':
			for (const element of node.elements) yield* declarations(element, property)
			return
		case 'ConditionalExpression':
			yield* declarations(node.consequent, property)
			yield* declarations(node.alternate, property)
			return
		case 'LogicalExpression':
			// && の左は条件で、|| と ?? の左は値
			if (node.operator !== '&&') yield* declarations(node.left, property)
			yield* declarations(node.right, property)
			return
	}
}

// style 属性は宣言の並びなので、<style> と同じ判定に通す。
// テンプレートに eslint-disable は届かない（→ ADR 20）ので、例外は <style> に移すことになる
function eachStyleAttribute(context, visit) {
	const services = context.sourceCode.parserServices ?? context.parserServices
	const document = services?.getDocumentFragment?.()
	if (!document) return

	for (const root of document.children) {
		for (const element of elements(root)) {
			for (const attribute of element.startTag.attributes) {
				const { key, value } = attribute
				if (!value) continue
				if (!attribute.directive) {
					if (key.name === 'style') visit(value.value, value)
					continue
				}
				if (key.name.name !== 'bind' || key.argument?.name !== 'style') continue
				for (const { text, node } of declarations(value.expression)) visit(text, node)
			}
		}
	}
}

const isString = (node) => node?.type === 'Literal' && typeof node.value === 'string'

// 名乗らない綴り（el.style[name]）は空。綴りを持たない値として読む
function memberName(node) {
	if (!node.computed && node.property.type === 'Identifier') return node.property.name
	if (isString(node.property)) return node.property.value
	return ''
}

// dataset の下に並ぶのは data 属性で、CSS ではない
const isStyleObject = (node) =>
	node?.type === 'MemberExpression' &&
	memberName(node) === 'style' &&
	!(node.object.type === 'MemberExpression' && memberName(node.object) === 'dataset')

// cssText は宣言の並びをまるごと受けるので、プロパティの綴りは値の側が持つ
const CSS_TEXT = 'css-text'

// script から要素のスタイルへ書く経路。書いた先は宣言になるので、style 属性と同じ判定に通す
function* styleWrites(node) {
	if (node.type === 'AssignmentExpression') {
		const target = node.left
		if (target.type !== 'MemberExpression') return
		if (isStyleObject(target)) {
			yield* declarations(node.right)
			return
		}
		if (!isStyleObject(target.object)) return
		const property = kebab(memberName(target))
		yield* declarations(node.right, property === CSS_TEXT ? '' : property)
		return
	}
	const callee = node.callee
	if (callee?.type !== 'MemberExpression') return
	const method = memberName(callee)
	const [first, second] = node.arguments
	if (method === 'setProperty' && isStyleObject(callee.object)) {
		yield* declarations(second, isString(first) ? kebab(first.value) : '')
		return
	}
	if (method === 'setAttribute' && isString(first) && /^style$/i.test(first.value)) {
		yield* declarations(second)
		return
	}
	if (
		method === 'assign' &&
		callee.object.type === 'Identifier' &&
		callee.object.name === 'Object' &&
		isStyleObject(first)
	) {
		for (const source of node.arguments.slice(1)) yield* declarations(source)
	}
}

// HTML ごと書く経路（innerHTML・document.write）では、CSS として読めるのは <style> の中身だけ
const STYLE_ELEMENT = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi

// script が組み立てたスタイルシート。insertRule・textContent・innerHTML のような書き込み先を
// 数えると数え落とした先と束縛越しの組み立てが抜け道になるので、綴りが規則か at-rule として
// 読めるかで見る。どちらも無い文字列は宣言の並びか CSS でない綴りで、前者は style 属性が見る
function* stylesheetsIn(text) {
	if (!text.includes('{') && !text.includes('@')) return
	const bodies = [...text.matchAll(STYLE_ELEMENT)].map(([, body]) => body)
	for (const candidate of [text, ...bodies]) {
		let root
		try {
			root = postcss.parse(candidate, { from: undefined })
		} catch {
			continue
		}
		let found = false
		const mark = () => {
			found = true
		}
		root.walkRules(mark)
		root.walkAtRules(mark)
		if (found) yield root
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
const SCROLL_BEHAVIOR = new RegExp(SCROLL_BEHAVIOR_CLASS)
const DISPLAY_PROPERTY = /^display$/i
// display が消すのは none のときだけ。flex と grid は並べ方で、出し分けではない
const HIDDEN_DISPLAY = /(?<![\w-])none(?![\w-])/i
// @apply hidden も宣言に開くと display: none になる。variant が前に付く
const HIDDEN_CLASS = /(?:^|[\s:])(?:[a-z-]+:)*!?hidden(?![\w-])/
// style 属性は宣言の並びなので、綴りから display の宣言を取り出す
const DISPLAY_DECLARATION = /(?<![\w-])display\s*:([^;]*)/gi
const OUTLINE_PROPERTY = /^outline(?:-(?:style|width|color))?$/i
const OUTLINE_RESET_PROPERTY = /^(?:all|outline(?:-style)?)$/i
// 宣言と style 属性で判定が割れないよう、値は綴りも同じものを使う
const NO_OUTLINE_VALUE = new RegExp(OUTLINE_REMOVAL_VALUE, 'i')
const RESET_OUTLINE_VALUE = new RegExp(OUTLINE_RESET_VALUE, 'i')
const OUTLINE_REMOVAL = new RegExp(OUTLINE_REMOVAL_CLASS)
const OFF_TOKEN_FONT = new RegExp(OFF_TOKEN_FONT_CLASS)

// 同じ綴りを no-restricted-syntax が script の Literal から読む判定。そちらが先に見るので、
// 組み立てたスタイルシートからは読まずに報告を一方へ寄せる。綴りで取れない側（.dark の
// セレクタ・@font-face・@import）はここに載らないので、判定はスタイルシートから残る
const SPELLED_IN_SCRIPT = {
	'no-scroll-behavior': new RegExp(`${SCROLL_BEHAVIOR_PROPERTY}|${SCROLL_BEHAVIOR_CLASS}`, 'i'),
	'no-reduced-motion': REDUCED_MOTION,
	'no-theme-branch': COLOR_SCHEME,
	'no-web-font': new RegExp(WEB_FONT_RESOURCE, 'i'),
	'no-custom-breakpoint': new RegExp(BREAKPOINT_MEDIA, 'i'),
}

// 判定の正本。<style> は ESLint のルールとして、.css は scripts/check-css.mjs から同じものを使う
const CHECKS = {
	'no-untokenized-size': {
		messages: {
			untokenized: `{{literal}} は Tailwind のスケールにも theme/tokens.ts の sizes にも無い。sizes に名前を足すか、スケールの値で書く。 ${TOKEN_URL}`,
		},
		find(root) {
			const found = []
			const check = (value, node) => {
				for (const literal of untokenizedLengths(value))
					found.push({ node, messageId: 'untokenized', data: { literal } })
			}
			root.walkDecls((decl) => check(decl.value, decl))
			root.walkAtRules((rule) => check(rule.params, rule))
			return found
		},
		fromAttribute(text) {
			return untokenizedLengths(text).map((literal) => ({
				messageId: 'untokenized',
				data: { literal },
			}))
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
			// walkDecls は at-rule を見ないので、@apply の任意値は別に歩く。
			// 他の at-rule まで見ると、@keyframes の名前が色の名前に当たる
			root.walkAtRules('apply', (rule) => check(rule.params, rule))
			return found
		},
		fromAttribute(text) {
			return colorLiterals(text).map((literal) => ({
				messageId: 'literal',
				data: { literal },
			}))
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
		fromAttribute(text) {
			const found = []
			for (const [, value] of text.matchAll(FONT_DECLARATION))
				for (const literal of fontLiterals(value))
					found.push({ messageId: 'literal', data: { literal } })
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
		fromAttribute(text) {
			const found = []
			for (const [, value] of text.matchAll(DISPLAY_DECLARATION))
				if (HIDDEN_DISPLAY.test(value)) found.push({ messageId: 'displayNone' })
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

const ruleOf = (name, check) => ({
	meta: { type: 'problem', schema: [], messages: check.messages },
	create(context) {
		const report = (text, node) => {
			for (const found of check.fromAttribute(text)) {
				context.report({ loc: node.loc, ...found })
			}
		}
		const spelled = SPELLED_IN_SCRIPT[name]
		// 宣言の並びとして読んだ値。ESLint は親から歩くので、書き込みの方が先に入れる
		const written = new Set()
		const reportSheet = (text, node) => {
			if (written.has(node) || spelled?.test(text)) return
			for (const root of stylesheetsIn(text))
				for (const { messageId, data } of check.find(root)) {
					context.report({ loc: node.loc, messageId, data })
				}
		}
		const write = (node) => {
			for (const { text, node: value } of styleWrites(node)) {
				written.add(value)
				report(text, value)
			}
		}
		// 組み立てたスタイルシートは綴りで取れない判定が読む。宣言の並びを読む判定は要素への書き込みも見る
		const inScript = {
			Literal(node) {
				if (typeof node.value === 'string') reportSheet(node.value, node)
			},
			TemplateElement(node) {
				if (typeof node.value.cooked === 'string') reportSheet(node.value.cooked, node)
			},
			...(check.fromAttribute ? { AssignmentExpression: write, CallExpression: write } : {}),
		}
		const script = {
			...inScript,
			Program() {
				eachStyleBlock(context, (root, locate) => {
					for (const { node, messageId, data } of check.find(root)) {
						context.report({ loc: locate(node), messageId, data })
					}
				})
				if (!check.fromAttribute) return
				eachStyleAttribute(context, report)
			},
		}
		// 素の visitor は <script> しか歩かない。行内ハンドラは template 側に渡して同じ判定に通す
		const services = context.sourceCode.parserServices ?? context.parserServices
		if (!services?.defineTemplateBodyVisitor) return script
		return services.defineTemplateBodyVisitor(inScript, script)
	},
})

export default {
	rules: Object.fromEntries(
		Object.entries(CHECKS).map(([name, check]) => [name, ruleOf(name, check)]),
	),
}
