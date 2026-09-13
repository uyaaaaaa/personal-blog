import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const TOKENS = 'theme/tokens.ts'
const MANIFEST = 'public/site.webmanifest'
const CONFIG = 'nuxt.config.ts'

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

const read = (path) => {
	try {
		return readFileSync(join(ROOT, path), 'utf8')
	} catch (error) {
		fail(`${path} を読み取れない:`, `  ${error.message}`)
	}
}

const load = async (path) => {
	try {
		return await import(pathToFileURL(join(ROOT, path)).href)
	} catch (error) {
		fail(`${path} を読み取れない:`, `  ${error.message}`)
	}
}

const json = (path) => {
	try {
		return JSON.parse(read(path))
	} catch (error) {
		fail(`${path} を JSON として読めない:`, `  ${error.message}`)
	}
}

// Shiki のテーマは nuxt.config.ts が選ぶ。設定は defineNuxtConfig と拡張子の無い import を持ち、
// Nuxt の外では import できないので綴りから読む
const SKIPPED = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|(['"`])(?:\\[\s\S]|(?!\1)[\s\S])*?\1/y
const QUOTED = /^(['"])((?:\\.|(?!\1).)*)\1/
const NAMED = /(\w+)\s*:\s*(['"])(.+?)\2/g

const key = (name) => new RegExp(`(?:^|[{,;\\s])${name}\\s*:\\s*`)

// 入れ子と、括弧を含む文字列・コメントを跨いで閉じ括弧を探す
const balanced = (source) => {
	let depth = 0
	for (let at = 0; at < source.length; at += 1) {
		SKIPPED.lastIndex = at
		const skipped = SKIPPED.exec(source)
		if (skipped) {
			at += skipped[0].length - 1
			continue
		}
		if (source[at] === '{') depth += 1
		else if (source[at] === '}' && (depth -= 1) === 0) return source.slice(1, at)
	}
	return null
}

// 値そのものだけを返す。ブロックの外まで探して別の場所の同名のキーを拾わないようにする
const valueOf = (source, name) => {
	const found = key(name).exec(source)
	if (!found) return null
	const rest = source.slice(found.index + found[0].length)
	const quoted = QUOTED.exec(rest)
	if (quoted) return { name: quoted[2] }
	return rest.startsWith('{') ? { block: balanced(rest) } : null
}

const unreadable = (what) => fail(`${CONFIG} から Shiki のテーマを読み取れない:`, `  ${what}`)

const highlightThemes = (source) => {
	const highlight = valueOf(source, 'highlight')
	if (highlight?.block == null) unreadable('highlight のブロックが無い')

	const theme = valueOf(highlight.block, 'theme')
	if (theme === null) unreadable('highlight.theme が無い')
	if (theme.name !== undefined) return { default: theme.name, dark: theme.name }
	if (theme.block === null) unreadable('highlight.theme のブロックが閉じていない')

	return Object.fromEntries(
		[...theme.block.matchAll(NAMED)].map(([, name, , value]) => [name, value]),
	)
}

const foreground = async (name) => {
	if (name === undefined) unreadable('highlight.theme に綴りが無い')

	let theme
	try {
		// テーマは依存に宣言せず、@nuxtjs/mdc が入れたものをそのまま読む。自前で足すと、
		// ビルドが使うテーマと別のバージョンを突き合わせうる
		theme = (await import(`@shikijs/themes/${name}`)).default
	} catch (error) {
		fail(`Shiki のテーマ ${name} を読み取れない:`, `  ${error.message}`)
	}
	const value = theme.colors?.['editor.foreground']
	if (value === undefined) fail(`Shiki のテーマ ${name} が editor.foreground を持たない`)
	return value
}

const { colors, darkColors } = await load(TOKENS)
const manifest = json(MANIFEST)
const themes = highlightThemes(read(CONFIG))

// webmanifest は JSON なのでトークンを読めず、地の色を直値で持つ。ずれるとインストール後の
// 起動画面だけ違う地の色になる
const bg = (name) => ({
	where: `${MANIFEST} の ${name}`,
	actual: manifest?.[name],
	expected: colors?.bg,
	source: `${TOKENS} の colors.bg`,
})

// ProsePre は diff のマーカーと変化した語に code-text を当てる。テーマの前景色とずれると、
// 同じ行の隣のトークンだけ違う灰になる
const codeText = async (name, palette, chosen) => ({
	where: `${TOKENS} の ${name}['code-text']`,
	actual: palette?.['code-text'],
	expected: await foreground(themes[chosen]),
	source: `Shiki のテーマ ${themes[chosen]} の editor.foreground`,
})

const copies = [
	bg('theme_color'),
	bg('background_color'),
	await codeText('colors', colors, 'default'),
	await codeText('darkColors', darkColors, 'dark'),
]

const compared = ({ where, actual, expected, source }) => {
	if (typeof expected !== 'string') return `${where} の正本 ${source} に値が無い`
	if (typeof actual !== 'string') return `${where} に値が無い（${source} は ${expected}）`
	return actual.toLowerCase() === expected.toLowerCase()
		? null
		: `${where} は ${actual}、${source} は ${expected}`
}

const errors = copies.map(compared).filter(Boolean)

if (errors.length > 0) {
	fail('トークンの値の写しがずれている:', ...errors.map((error) => `  ${error}`))
}

console.log(`✔ copied token values match their source (${copies.length} copies)`)
