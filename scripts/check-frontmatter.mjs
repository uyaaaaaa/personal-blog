import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontMatter } from 'remark-mdc'
import { articleSchema } from '../content.schema.ts'
import { articleFiles } from './article-files.mjs'

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

const { dir, files } = articleFiles(process.argv[2])

const errors = []
for (const name of files) {
	const { data } = parseFrontMatter(readFileSync(join(dir, name), 'utf8'))
	const result = articleSchema.safeParse(data)
	if (result.success) continue

	for (const issue of result.error.issues) {
		const where = issue.path.join('.')
		errors.push(`${name}: ${where === '' ? '' : `${where}: `}${issue.message}`)
	}
}

if (errors.length > 0) {
	fail(
		'フロントマターがスキーマ（content.schema.ts）に合わない:',
		...errors.map((error) => `  ${error}`),
	)
}

console.log(`✔ all frontmatter matches the schema (${files.length} articles)`)
