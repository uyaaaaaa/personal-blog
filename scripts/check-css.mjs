import postcss from 'postcss'
import { findings } from '../eslint-rules/style-tokens.mjs'
import { fail, inputs } from './check-io.mjs'

const SKIP = new Set(['.git', '.nuxt', '.output', '.verify', 'dist', 'node_modules'])
// バンドラが前処理なしで読む綴り。sass 等は依存を足す時点で差分に出る
const STYLESHEET = /\.(css|pcss|postcss)$/i

const { read, entries } = inputs(process.argv[2])

function* stylesheets(directory) {
	for (const entry of entries(directory)) {
		if (SKIP.has(entry.name)) continue
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		if (entry.isDirectory()) yield* stylesheets(path)
		else if (STYLESHEET.test(entry.name)) yield path
	}
}

const files = [...stylesheets('')]

const errors = []
for (const file of files) {
	let root
	try {
		root = postcss.parse(read(file), { from: undefined })
	} catch (error) {
		errors.push(`${file}: CSS として読めない（${error.message}）`)
		continue
	}
	for (const { line, message } of findings(root)) errors.push(`${file}:${line}: ${message}`)
}

if (errors.length > 0) {
	fail('CSS ファイルが <style> と同じ規約に反している:', ...errors.map((error) => `  ${error}`))
}

console.log(`✔ stylesheets follow the style rules (${files.length} files)`)
