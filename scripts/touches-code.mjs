import { execFileSync } from 'node:child_process'

// 記事は content/ の下にしか置けない（scripts/article-files.mjs）
const ARTICLE = /^content\//

const TOUCHES_CODE = 0
const ARTICLE_ONLY = 1

// 名前の変更を1件に畳むと、コードから記事へ移したときに消えた側のパスが出ない
const changed = (...range) =>
	execFileSync('git', ['diff', '--cached', '--name-only', '--no-renames', ...range], {
		encoding: 'utf8',
	})
		.split('\n')
		.filter((path) => path !== '')

let paths
try {
	paths = changed()
	// index が空になるのは --amend。作り直す先のコミットが含むものを見る
	if (paths.length === 0) paths = changed('HEAD^')
} catch (error) {
	const [reason] = error.message.split('\n')
	console.error(`変更されたパスを読み取れないので、コードの検査も回す: ${reason}`)
	process.exit(TOUCHES_CODE)
}

process.exit(
	paths.length > 0 && paths.every((path) => ARTICLE.test(path)) ? ARTICLE_ONLY : TOUCHES_CODE,
)
