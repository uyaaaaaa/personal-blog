import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

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
// Nuxt の外では import できないので、構文木から値だけを読む
const THEME_PATH = ['content', 'build', 'markdown', 'highlight', 'theme']

const unreadable = (what) => fail(`${CONFIG} から Shiki のテーマを読み取れない:`, `  ${what}`)

const named = (node) => (ts.isIdentifier(node) || ts.isStringLiteralLike(node) ? node.text : null)

const valueOf = (node, name) =>
	ts.isObjectLiteralExpression(node)
		? node.properties.find(
				(property) => ts.isPropertyAssignment(property) && named(property.name) === name,
			)?.initializer
		: undefined

// defineNuxtConfig(...) でも素のオブジェクトでも、設定の実体まで降りる
const configObject = (source) => {
	const exported = source.statements.find(ts.isExportAssignment)?.expression
	if (exported === undefined) return undefined
	return ts.isCallExpression(exported) ? exported.arguments[0] : exported
}

const themeNode = (source) => {
	let node = configObject(ts.createSourceFile(CONFIG, source, ts.ScriptTarget.Latest, true))
	for (const [at, name] of THEME_PATH.entries()) {
		if (node === undefined) unreadable(`${THEME_PATH.slice(0, at + 1).join('.')} が無い`)
		node = valueOf(node, name)
	}
	if (node === undefined) unreadable(`${THEME_PATH.join('.')} が無い`)
	return node
}

const highlightThemes = (source) => {
	const node = themeNode(source)
	if (ts.isStringLiteralLike(node)) return { default: node.text, dark: node.text }

	const spelling = (name) => {
		const chosen = valueOf(node, name)
		return chosen !== undefined && ts.isStringLiteralLike(chosen) ? chosen.text : undefined
	}
	return { default: spelling('default'), dark: spelling('dark') }
}

const foreground = async (name, chosen) => {
	if (name === undefined) unreadable(`${THEME_PATH.join('.')}.${chosen} に綴りが無い`)

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
	expected: await foreground(themes[chosen], chosen),
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
