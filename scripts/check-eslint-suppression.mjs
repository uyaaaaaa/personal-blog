import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsParser from '@typescript-eslint/parser'
import * as vueParser from 'vue-eslint-parser'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const SKIP = new Set(['.git', '.nuxt', '.output', '.verify', 'dist', 'node_modules'])
const SOURCE = /\.(vue|[cm]?[jt]sx?)$/i

// ESLint がディレクティブと見るのは、コメントの先頭がこの綴りのものだけ。
// ファイル全体に効く eslint-disable と、重さを書き換える eslint はブロックコメントでしか効かない
const DISABLE = /^eslint-disable(?:-next-line|-line)?(?![\w-])/
const LINE_DISABLE = /^eslint-disable-(?:next-line|line)(?![\w-])/
const CONFIG = /^eslint(?![\w-])/
const DESCRIPTION = '--'

const disables = (comment) =>
	(comment.type === 'Block' ? DISABLE : LINE_DISABLE).test(comment.value.trim())

// 重さの書き換えは位置に依らずファイル全体に効くので、並びを固定しても届く先が変わらない
const configures = (comment) => comment.type === 'Block' && CONFIG.test(comment.value.trim())

function* sources(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (SKIP.has(entry.name)) continue
		const path = join(directory, entry.name)
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

// 読む口は ESLint と同じパーサーにする。文字列に書いた綴りをコメントと数えないため
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
	if (description.join(DESCRIPTION).trim() === '')
		reasons.push(`理由を ${DESCRIPTION} の後ろに書く`)
	return reasons
}

const errors = []
for (const file of [...sources(ROOT)]) {
	const where = relative(ROOT, file)
	let comments
	try {
		comments = commentsOf(readFileSync(file, 'utf8'), file)
	} catch (error) {
		errors.push(`${where}: 読めない（${error.message}）`)
		continue
	}
	for (const comment of comments ?? []) {
		const line = comment.loc.start.line
		if (configures(comment))
			errors.push(
				`${where}:${line}: ルールの重さをここで変えない。eslint.config.mjs で決める`,
			)
		if (!disables(comment)) continue
		for (const reason of reasonsAgainst(comment.value))
			errors.push(`${where}:${line}: ${reason}`)
	}
}

if (errors.length > 0) {
	console.error('ESLint の抑制が、ルール名と理由を書いた eslint-disable になっていない:')
	for (const error of errors) console.error(`  ${error}`)
	process.exit(1)
}

console.log('✔ every eslint suppression is a disable that names its rules and its reason')
