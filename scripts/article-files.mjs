import { join, relative } from 'node:path'
import { fail, inputs } from './inputs.mjs'

const ARTICLES = 'content/article'

export const articleFiles = (given) => {
	const { root, entries, read } = inputs(given)
	const dir = join(root, ARTICLES)

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

	return {
		files: found.map((entry) => entry.name),
		read: (name) => read(`${ARTICLES}/${name}`),
	}
}
