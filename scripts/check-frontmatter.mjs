import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontMatter } from 'remark-mdc'
import { articleSchema } from '../content.schema.ts'

const ARTICLE_DIR = fileURLToPath(new URL('../content/article', import.meta.url))

const files = readdirSync(ARTICLE_DIR, { recursive: true }).filter((name) => name.endsWith('.md'))

const errors = []
for (const name of files) {
	const { data } = parseFrontMatter(readFileSync(join(ARTICLE_DIR, name), 'utf8'))
	const result = articleSchema.safeParse(data)
	if (result.success) continue

	for (const issue of result.error.issues) {
		const where = issue.path.join('.')
		errors.push(`${name}: ${where === '' ? '' : `${where}: `}${issue.message}`)
	}
}

if (errors.length > 0) {
	console.error('フロントマターがスキーマ（content.schema.ts）に合わない:')
	for (const error of errors) console.error(`  ${error}`)
	process.exit(1)
}

console.log(`✔ all frontmatter matches the schema (${files.length} articles)`)
