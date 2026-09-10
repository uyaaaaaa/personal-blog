import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import { findings } from '../eslint-rules/style-tokens.mjs'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const SKIP = new Set(['.git', '.nuxt', '.output', '.verify', 'dist', 'node_modules'])
// バンドラが前処理なしで読む綴り。sass 等は依存を足す時点で差分に出る
const STYLESHEET = /\.(css|pcss|postcss)$/i

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
	for (const { line, message } of findings(root)) errors.push(`${where}:${line}: ${message}`)
}

if (errors.length > 0) {
	console.error('CSS ファイルが <style> と同じ規約に反している:')
	for (const error of errors) console.error(`  ${error}`)
	process.exit(1)
}

console.log(`✔ stylesheets follow the style rules (${files.length} files)`)
