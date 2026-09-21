import { join, relative } from 'node:path'
import { fail, inputs } from './check-io.mjs'

export const ARTICLES = 'content/article'

// 記事は /article/<スラッグ> の1階層にしか載らず、下の階層に置くと prerender が 404 で落ちる
export const articleFiles = (given) => {
	const { root, entries } = inputs(given)
	const dir = join(root, ARTICLES)

	// Nuxt は article/**/*.md で symlink も拾う。dirent では isFile() が false になる
	const found = entries(ARTICLES, { recursive: true }).filter(
		(entry) => (entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith('.md'),
	)

	const nested = found.filter((entry) => entry.parentPath !== dir)
	if (nested.length > 0) {
		fail(
			`記事は ${ARTICLES} の直下に置く:`,
			...nested.map((entry) => `  ${join(relative(dir, entry.parentPath), entry.name)}`),
		)
	}

	return { dir, files: found.map((entry) => entry.name) }
}
