import { extname } from 'node:path'
import tsParser from '@typescript-eslint/parser'
import * as vueParser from 'vue-eslint-parser'
import { fail, ignores, inputs } from './inputs.mjs'

const SKIP = new Set(ignores)
const SOURCE = /\.(vue|[cm]?[jt]sx?)$/i

const DISABLE = /^eslint-disable(?:-next-line|-line)?(?![\w-])/
const LINE_DISABLE = /^eslint-disable-(?:next-line|line)(?![\w-])/
const CONFIG = /^eslint(?![\w-])/
const DESCRIPTION = '--'
const UNSUPPRESSIBLE = ['style/no-motion-important']

const { read, entries } = inputs(process.argv[2])

const disables = (comment) =>
	(comment.type === 'Block' ? DISABLE : LINE_DISABLE).test(comment.value.trim())

const configures = (comment) => comment.type === 'Block' && CONFIG.test(comment.value.trim())

function* sources(directory) {
	for (const entry of entries(directory)) {
		if (SKIP.has(entry.name)) continue
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		if (entry.isDirectory()) yield* sources(path)
		else if (SOURCE.test(entry.name)) yield path
	}
}

const parserOptions = {
	ecmaVersion: 'latest',
	sourceType: 'module',
	comment: true,
	loc: true,
	range: true,
}

const commentsOf = (code, file) =>
	extname(file).toLowerCase() === '.vue'
		? vueParser.parseForESLint(code, { ...parserOptions, parser: tsParser }).ast.comments
		: tsParser.parseForESLint(code, parserOptions).ast.comments

const reasonsAgainst = (value) => {
	const body = value.trim().replace(DISABLE, '')
	const [rules, ...description] = body.split(DESCRIPTION)
	const reasons = []
	if (rules.trim() === '')
		reasons.push('ルール名を書く。書かないと、その先の制限が全部まとめて消える')
	for (const rule of rules.split(',').map((name) => name.trim()))
		if (UNSUPPRESSIBLE.includes(rule)) reasons.push(`${rule} は抑制できない`)
	if (description.join(DESCRIPTION).trim() === '')
		reasons.push(`理由を ${DESCRIPTION} の後ろに書く`)
	return reasons
}

const errors = []
for (const file of [...sources('')]) {
	let comments
	try {
		comments = commentsOf(read(file), file)
	} catch (error) {
		errors.push(`${file}: ソースとして解析できない（${error.message}）`)
		continue
	}
	for (const comment of comments ?? []) {
		const line = comment.loc.start.line
		if (configures(comment))
			errors.push(`${file}:${line}: ルールの重さをここで変えない。eslint.config.mjs で決める`)
		if (!disables(comment)) continue
		for (const reason of reasonsAgainst(comment.value))
			errors.push(`${file}:${line}: ${reason}`)
	}
}

if (errors.length > 0) {
	fail(
		'ESLint の抑制が、ルール名と理由を書いた eslint-disable になっていない:',
		...errors.map((error) => `  ${error}`),
	)
}

console.log('✔ every eslint suppression is a disable that names its rules and its reason')
