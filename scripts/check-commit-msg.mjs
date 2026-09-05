import { readFileSync } from 'node:fs'

const SUBJECT_MIN = 12
const SUBJECT_MAX = 50
const EXEMPT = /^(Merge |Revert |fixup!|squash!|amend!)/
const JAPANESE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

const path = process.argv[2]
if (!path) fail('コミットメッセージのファイルが渡されていない')

const lines = readFileSync(path, 'utf8')
	.split(/^#\s*-+\s*>8\s*-+.*$/m)[0]
	.split(/\r?\n/)
	.filter((line) => !line.startsWith('#'))

while (lines.length > 0 && lines[0].trim() === '') lines.shift()

const subject = (lines[0] ?? '').trim()
if (subject === '' || EXEMPT.test(subject)) process.exit(0)

const length = [...subject].length
const errors = []

if (length < SUBJECT_MIN) {
	errors.push(`件名が${length}字しかない。何をどう変えたかを${SUBJECT_MIN}字以上で書く`)
} else if (length > SUBJECT_MAX) {
	errors.push(`件名が${length}字ある。${SUBJECT_MAX}字に収まらないなら2つの変更が入っている`)
}
if (!JAPANESE.test(subject)) {
	errors.push('件名に日本語がない。日本語の言い切りで書く')
}
if (subject.endsWith('。')) {
	errors.push('件名の末尾に句点が付いている')
}
if (lines.length > 1 && lines[1].trim() !== '') {
	errors.push('件名と本文の間に空行がない')
}

if (errors.length > 0) {
	fail(
		'コミットメッセージが規約に合わない:',
		`  件名: ${subject}`,
		...errors.map((error) => `  - ${error}`),
		'',
		'  規約: .claude/rules/commit.md',
	)
}
