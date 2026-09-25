import postcss from 'postcss'
import { findings } from '../eslint-rules/style-tokens.mjs'
import { fail, ignores, inputs } from './inputs.mjs'

const SKIP = new Set(ignores)
const STYLESHEET = /\.(css|pcss|postcss)$/i

export const check = (root) => {
	const { read, entries } = inputs(root)

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
		fail(
			'CSS ファイルが <style> と同じ規約に反している:',
			...errors.map((error) => `  ${error}`),
		)
	}

	console.log(`✔ stylesheets follow the style rules (${files.length} files)`)
}

if (process.argv[1]?.endsWith('check-css.mjs')) check(process.argv[2])
