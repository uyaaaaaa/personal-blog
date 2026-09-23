import { extname } from 'node:path'
import tsParser from '@typescript-eslint/parser'
import postcss from 'postcss'
import * as vueParser from 'vue-eslint-parser'
import { fail, ignores, inputs } from './inputs.mjs'

const SKIP = new Set(ignores)
const SOURCE = /\.(vue|[cm]?[jt]sx?)$/i
const HASH = /\.ya?ml$/i
const HOOKS = '.githooks'

const DIRECTIVE = /^(?:eslint|@ts-|prettier-ignore|@vitest-|globals?\s)/
const HASH_LINE = /^\s*#(?!!)/
const BLANK_LINE = /\n[^\S\n]*\n/

const { read, entries } = inputs(process.argv[2])

function* files(directory) {
	for (const entry of entries(directory)) {
		if (SKIP.has(entry.name)) continue
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		if (entry.isDirectory()) yield* files(path)
		else if (SOURCE.test(entry.name) || HASH.test(entry.name) || directory === HOOKS) yield path
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
					range: [offset + node.source.start.offset, offset + node.source.end.offset + 1],
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

const hashComments = (code) => {
	const found = []
	let offset = 0
	for (const [at, line] of code.split('\n').entries()) {
		const match = HASH_LINE.exec(line)
		if (match) {
			const start = offset + line.indexOf('#')
			found.push({
				value: line.slice(line.indexOf('#') + 1),
				start: at + 1,
				end: at + 1,
				range: [start, offset + line.length],
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
		comments = SOURCE.test(file) ? sourceComments(code, file) : hashComments(code)
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
