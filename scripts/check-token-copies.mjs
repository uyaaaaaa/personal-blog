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
const HIGHLIGHT_THEME = /\bhighlight:\s*\{[\s\S]*?\btheme:\s*(?:(['"])(.+?)\1|\{([\s\S]*?)\})/
const NAMED = /(\w+)\s*:\s*(['"])(.+?)\2/g

const highlightThemes = (source) => {
	const found = source.match(HIGHLIGHT_THEME)
	if (!found) fail(`${CONFIG} から Shiki のテーマを読み取れない:`, '  highlight.theme が無い')
	if (found[2] !== undefined) return { default: found[2], dark: found[2] }
	return Object.fromEntries([...found[3].matchAll(NAMED)].map(([, key, , name]) => [key, name]))
}

const foreground = async (name) => {
	if (name === undefined) {
		fail(`${CONFIG} から Shiki のテーマを読み取れない:`, '  highlight.theme に綴りが無い')
	}
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
const bg = (key) => ({
	where: `${MANIFEST} の ${key}`,
	actual: manifest[key],
	expected: colors.bg,
	source: `${TOKENS} の colors.bg`,
})

// ProsePre は diff のマーカーと変化した語に code-text を当てる。テーマの前景色とずれると、
// 同じ行の隣のトークンだけ違う灰になる
const codeText = async (name, palette, key) => ({
	where: `${TOKENS} の ${name}['code-text']`,
	actual: palette['code-text'],
	expected: await foreground(themes[key]),
	source: `Shiki のテーマ ${themes[key]} の editor.foreground`,
})

const copies = [
	bg('theme_color'),
	bg('background_color'),
	await codeText('colors', colors, 'default'),
	await codeText('darkColors', darkColors, 'dark'),
]

const errors = copies
	.filter(({ actual, expected }) => String(actual).toLowerCase() !== expected.toLowerCase())
	.map(({ where, actual, expected, source }) => `${where} は ${actual}、${source} は ${expected}`)

if (errors.length > 0) {
	fail('トークンの値の写しがずれている:', ...errors.map((error) => `  ${error}`))
}

console.log(`✔ copied token values match their source (${copies.length} copies)`)
