import { extname } from 'node:path'
import tsParser from '@typescript-eslint/parser'
import postcss from 'postcss'
import { Parser } from 'yaml'
import * as vueParser from 'vue-eslint-parser'
import { fail, ignores, inputs } from './inputs.mjs'

const SKIP = new Set(ignores)
const SOURCE = /\.(vue|ts|mjs|cjs)$/i
const YAML = /\.yml$/i
const HOOKS = '.githooks/'

const DIRECTIVE =
	/^(?:eslint(?:-(?:disable(?:-next-line|-line)?|enable|env))?(?:$|\s+(?:--|[@\w./-]))|@ts-(?:check|nocheck|ignore|expect-error)\b|prettier-ignore(?:-attribute|-start|-end)?\b|@vitest-(?:environment|environment-options)\b|globals?\s+[$\w]|\/\s*<reference\b)/
const SHEBANG = '#!'
const BLANK_LINE = /\n[^\S\n]*\n/

const { read, entries } = inputs(process.argv[2])

function* files(directory) {
	for (const entry of entries(directory)) {
		if (SKIP.has(entry.name)) continue
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		if (entry.isDirectory()) yield* files(path)
		else if (SOURCE.test(entry.name) || YAML.test(entry.name) || path.startsWith(HOOKS))
			yield path
	}
}

const parserOptions = {
	ecmaVersion: 'latest',
	sourceType: 'module',
	comment: true,
	loc: true,
	range: true,
}

const span = (comment) => ({
	value: comment.value,
	start: comment.loc.start.line,
	end: comment.loc.end.line,
	range: comment.range,
})

const styleComments = (document) => {
	const found = []
	for (const element of document?.children ?? []) {
		if (element.type !== 'VElement' || element.name !== 'style') continue
		for (const child of element.children) {
			if (child.type !== 'VText') continue
			const base = child.loc.start.line - 1
			const offset = child.range[0]
			postcss.parse(child.value, { from: undefined }).walkComments((node) => {
				found.push({
					value: node.text,
					start: base + node.source.start.line,
					end: base + node.source.end.line,
					range: [offset + node.source.start.offset, offset + node.source.end.offset],
				})
			})
		}
	}
	return found
}

const sourceComments = (code, file) => {
	if (extname(file).toLowerCase() !== '.vue')
		return tsParser.parseForESLint(code, parserOptions).ast.comments.map(span)
	const { ast, services } = vueParser.parseForESLint(code, { ...parserOptions, parser: tsParser })
	return [
		...ast.comments.map(span),
		...(ast.templateBody?.comments ?? []).map(span),
		...styleComments(services.getDocumentFragment?.()),
	]
}

const lineAt = (code, offset) => code.slice(0, offset).split('\n').length

const yamlComments = (code) => {
	const found = []
	const walk = (node) => {
		if (Array.isArray(node)) return node.forEach(walk)
		if (node === null || typeof node !== 'object') return
		if (node.type === 'comment') {
			const line = lineAt(code, node.offset)
			found.push({
				value: node.source.slice(1),
				start: line,
				end: line,
				range: [node.offset, node.offset + node.source.length],
			})
		}
		for (const [key, value] of Object.entries(node)) if (key !== 'source') walk(value)
	}
	for (const token of new Parser().parse(code)) walk(token)
	return found
}

const heredocAt = (line, at) => {
	let cursor = at + 2
	if (line[cursor] === '-') cursor += 1
	while (/\s/.test(line[cursor] ?? '')) cursor += 1
	const quote = line[cursor]
	if (quote === "'" || quote === '"') {
		const end = line.indexOf(quote, cursor + 1)
		if (end < 0) return null
		return { delimiter: line.slice(cursor + 1, end), end }
	}
	const start = cursor
	while (cursor < line.length && !/[\s;&|()<>]/.test(line[cursor])) cursor += 1
	if (cursor === start) return null
	return { delimiter: line.slice(start, cursor), end: cursor - 1 }
}

const shellLine = (line, state) => {
	let { quote, arithmeticDepth } = state
	const heredocs = []
	for (let at = 0; at < line.length; at += 1) {
		const char = line[at]
		if (quote !== null) {
			if (char === '\\' && quote === '"') at += 1
			if (char === quote) quote = null
			continue
		}
		if (char === '\\') {
			at += 1
			continue
		}
		if (char === "'" || char === '"') {
			quote = char
			continue
		}
		if (line.startsWith('((', at)) {
			arithmeticDepth += 1
			at += 1
			continue
		}
		if (arithmeticDepth > 0 && line.startsWith('))', at)) {
			arithmeticDepth -= 1
			at += 1
			continue
		}
		if (arithmeticDepth > 0) continue
		if (line.startsWith('<<<', at)) {
			at += 2
			continue
		}
		if (line.startsWith('<<', at)) {
			const heredoc = heredocAt(line, at)
			if (heredoc !== null) {
				heredocs.push(heredoc.delimiter)
				at = heredoc.end
				continue
			}
		}
		if (char === '#' && (at === 0 || /\s/.test(line[at - 1])))
			return { column: at, heredocs, quote, arithmeticDepth }
	}
	return { column: -1, heredocs, quote, arithmeticDepth }
}

const shellComments = (code) => {
	const found = []
	let offset = 0
	let heredocs = []
	let state = { quote: null, arithmeticDepth: 0 }
	for (const [at, line] of code.split('\n').entries()) {
		if (heredocs.length > 0) {
			if (line.trim() === heredocs[0]) heredocs.shift()
			offset += line.length + 1
			continue
		}
		const scanned = shellLine(line, state)
		state = { quote: scanned.quote, arithmeticDepth: scanned.arithmeticDepth }
		heredocs.push(...scanned.heredocs)
		const column = at === 0 && line.startsWith(SHEBANG) ? -1 : scanned.column
		if (column >= 0) {
			found.push({
				value: line.slice(column + 1),
				start: at + 1,
				end: at + 1,
				range: [offset + column, offset + line.length],
			})
		}
		offset += line.length + 1
	}
	return found
}

const spread = (code, comments) => {
	const sorted = comments
		.filter(({ value }) => !DIRECTIVE.test(value.trim()))
		.sort((a, b) => a.range[0] - b.range[0])
	const found = []
	let group = null
	for (const comment of sorted) {
		const gap = group === null ? null : code.slice(group.range[1], comment.range[0])
		const joined = gap !== null && gap.trim() === '' && !BLANK_LINE.test(gap)
		if (joined)
			group = { ...group, end: comment.end, range: [group.range[0], comment.range[1]] }
		else {
			if (group !== null) found.push(group)
			group = comment
		}
	}
	if (group !== null) found.push(group)
	return found.filter(({ start, end }) => end > start)
}

const errors = []
for (const file of [...files('')]) {
	const code = read(file)
	let comments
	try {
		comments = SOURCE.test(file)
			? sourceComments(code, file)
			: YAML.test(file)
				? yamlComments(code)
				: shellComments(code)
	} catch (error) {
		errors.push(`${file}: ソースとして解析できない（${error.message}）`)
		continue
	}
	for (const { start, end } of spread(code, comments))
		errors.push(`${file}:${start}: ${end - start + 1}行にわたっている`)
}

if (errors.length > 0) {
	fail(
		'コメントは1行で書く。収まらないなら、名前や構造で表すか、コミットと PR に持たせる:',
		...errors.map((error) => `  ${error}`),
	)
}

console.log('✔ every comment fits on one line')
