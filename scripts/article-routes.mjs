import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontMatter } from 'remark-mdc'
import { articleFiles, fail } from './article-files.mjs'

export const articleRoutes = (given) => {
	const { dir, files } = articleFiles(given)

	const routes = []
	try {
		for (const name of files) {
			const { data } = parseFrontMatter(readFileSync(join(dir, name), 'utf8'))
			if (data.published === true) routes.push(`/article/${name.replace(/\.md$/, '')}`)
		}
	} catch (error) {
		fail('記事を読み取れない:', `  ${error.message}`)
	}

	return routes.sort()
}
