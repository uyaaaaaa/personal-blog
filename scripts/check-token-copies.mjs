import ts from 'typescript'
import { fail, inputs, loaded } from './inputs.mjs'

const TOKENS = 'theme/tokens.ts'
const MANIFEST = 'public/site.webmanifest'
const CONFIG = 'nuxt.config.ts'

const THEME_PATH = ['content', 'build', 'markdown', 'highlight', 'theme']

const unreadable = (what) => fail(`${CONFIG} から Shiki のテーマを読み取れない:`, `  ${what}`)

const named = (node) => (ts.isIdentifier(node) || ts.isStringLiteralLike(node) ? node.text : null)

const valueOf = (node, name) =>
	ts.isObjectLiteralExpression(node)
		? node.properties.find(
				(property) => ts.isPropertyAssignment(property) && named(property.name) === name,
			)?.initializer
		: undefined

const configObject = (source) => {
	const exported = source.statements.find(ts.isExportAssignment)?.expression
	if (exported === undefined) return undefined
	return ts.isCallExpression(exported) ? exported.arguments[0] : exported
}

const themeNode = (source) => {
	let node = configObject(ts.createSourceFile(CONFIG, source, ts.ScriptTarget.Latest, true))
	if (node === undefined) unreadable('既定のエクスポートが無い')

	for (const [at, name] of THEME_PATH.entries()) {
		const next = valueOf(node, name)
		if (next === undefined) unreadable(`${THEME_PATH.slice(0, at + 1).join('.')} が無い`)
		node = next
	}
	return node
}

const highlightThemes = (source) => {
	const node = themeNode(source)
	if (ts.isStringLiteralLike(node)) return { default: node.text, dark: node.text }

	const spelling = (name) => {
		const chosen = valueOf(node, name)
		return chosen !== undefined && ts.isStringLiteralLike(chosen) ? chosen.text : undefined
	}
	const chosen = spelling('default')
	return { default: chosen, dark: spelling('dark') ?? chosen }
}

const foreground = async (name, chosen) => {
	if (name === undefined) unreadable(`${THEME_PATH.join('.')}.${chosen} に綴りが無い`)

	const theme = (await loaded(`@shikijs/themes/${name}`, `Shiki のテーマ ${name}`)).default
	const value = theme.colors?.['editor.foreground']
	if (value === undefined) fail(`Shiki のテーマ ${name} が editor.foreground を持たない`)
	return value
}

export const check = async (root) => {
	const { read, json, load } = inputs(root)
	const { colors, darkColors } = await load(TOKENS)
	const manifest = json(MANIFEST)
	const themes = highlightThemes(read(CONFIG))

	const bg = (name) => ({
		where: `${MANIFEST} の ${name}`,
		actual: manifest?.[name],
		expected: colors?.bg,
		source: `${TOKENS} の colors.bg`,
	})

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
}

if (process.argv[1]?.endsWith('check-token-copies.mjs')) await check(process.argv[2])
