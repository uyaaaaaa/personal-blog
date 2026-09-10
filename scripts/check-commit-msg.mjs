import { readFileSync } from 'node:fs'

const SUBJECT_MIN = 12
const SUBJECT_MAX = 50
const EXEMPT = /^(Merge |Revert |fixup!|squash!|amend!)/
// 分類の接頭辞。型名は回収先（CHANGELOG・semver）を持つ語の閉じた列で絞る。
// 綴りを問わずに見ると、識別子で始まる件名（`run_in_background: true…`）に当たる
const PREFIX =
	/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^()\s]*\))?!?[:：]/i
const JAPANESE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
// 言い切りの語尾。動詞の終止形（う段のひらがな）と否定の「ない」だけを通す。
// 体言止めの語を並べても「〜のバグ」「〜のリファクタリング」に当たらず、名詞は際限なく増える
const ASSERTIVE = /(?:ない|[うくぐすつぬぶむる])$/u

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

if (PREFIX.test(subject)) {
	errors.push(
		'件名に分類の接頭辞が付いている。回収先の CHANGELOG も semver も無く、実装と文書を同じコミットに入れる規定と衝突する',
	)
}
if (length < SUBJECT_MIN) {
	errors.push(`件名が${length}字しかない。何をどう変えたかを${SUBJECT_MIN}字以上で書く`)
} else if (length > SUBJECT_MAX) {
	errors.push(`件名が${length}字ある。${SUBJECT_MAX}字に収まらないなら2つの変更が入っている`)
}
if (!JAPANESE.test(subject)) {
	errors.push('件名に日本語がない。日本語の言い切りで書く')
} else if (!ASSERTIVE.test(subject.replace(/。$/u, ''))) {
	errors.push(
		'件名が体言止めで終わっている。「〜対応」「〜の修正」をやめ、「〜する」「〜に替える」で終える',
	)
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
