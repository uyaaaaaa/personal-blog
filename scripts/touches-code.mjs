import { execFileSync } from 'node:child_process'

// 記事は content/ の下にしか置けない（scripts/article-files.mjs）
const ARTICLE = /^content\//

// 名前の変更を1件に畳むと、コードから記事へ移したときに消えた側のパスが出ない
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--no-renames'], {
	encoding: 'utf8',
})
	.split('\n')
	.filter((path) => path !== '')

// 空になるのは --amend など。絞り込む根拠が無いので、検査を回す側に倒す
process.exit(staged.length === 0 || staged.some((path) => !ARTICLE.test(path)) ? 0 : 1)
