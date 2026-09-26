import { execFileSync } from 'node:child_process'

// 記事は content/ の下にしか置けない（scripts/article-files.mjs）
const ARTICLE = /^content\//

const TOUCHES_CODE = 0
// node がクラッシュしたときの 1 と分けて、呼ぶ側が取り違えないようにする
const ARTICLE_ONLY = 2

// 名前の変更を1件に畳むと、コードから記事へ移したときに消えた側のパスが出ない
const changed = (...args) =>
	execFileSync('git', ['diff', '--name-only', '--no-renames', ...args], {
		encoding: 'utf8',
	})
		.split('\n')
		.filter((path) => path !== '')

const range = process.argv.slice(2)

let paths
try {
	paths = range.length > 0 ? changed(...range) : changed('--cached')
	// index が空になるのは --amend。作り直す先のコミットが含むものを見る
	if (range.length === 0 && paths.length === 0) paths = changed('--cached', 'HEAD^')
} catch (error) {
	const [reason] = error.message.split('\n')
	console.error(`変更されたパスを読み取れないので、コードの検査も回す: ${reason}`)
	process.exit(TOUCHES_CODE)
}

process.exit(
	paths.length > 0 && paths.every((path) => ARTICLE.test(path)) ? ARTICLE_ONLY : TOUCHES_CODE,
)
