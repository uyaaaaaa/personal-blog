import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import { IMPORT_MESSAGE, WEB_FONT_MESSAGE } from '../eslint-rules/style-tokens.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKIP = new Set(['.git', '.nuxt', '.output', '.verify', 'dist', 'node_modules'])
// バンドラが前処理なしで読む綴り。sass 等は依存を足す時点で差分に出る
const STYLESHEET = /\.(css|pcss|postcss)$/i

const MESSAGES = { 'font-face': WEB_FONT_MESSAGE, import: IMPORT_MESSAGE }

function* stylesheets(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP.has(entry.name)) continue
		const path = join(dir, entry.name)
		if (entry.isDirectory()) yield* stylesheets(path)
		else if (STYLESHEET.test(entry.name)) yield path
	}
}

const files = [...stylesheets(ROOT)]

const errors = []
for (const file of files) {
	const where = relative(ROOT, file)
	let root
	try {
		root = postcss.parse(readFileSync(file, 'utf8'), { from: undefined })
	} catch (error) {
		errors.push(`${where}: CSS として読めない（${error.message}）`)
		continue
	}
	root.walkAtRules((rule) => {
		const message = MESSAGES[rule.name.toLowerCase()]
		if (message) errors.push(`${where}:${rule.source.start.line}: ${message}`)
	})
}

if (errors.length > 0) {
	console.error('CSS ファイルが外部リソースを読み込んでいる:')
	for (const error of errors) console.error(`  ${error}`)
	process.exit(1)
}

console.log(`✔ no external resource loaded from stylesheets (${files.length} files)`)
