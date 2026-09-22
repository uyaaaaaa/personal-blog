import { readFrontMatter } from '../content.frontmatter.ts'
import { articleSchema } from '../content.schema.ts'
import { articleFiles } from './article-files.mjs'
import { fail } from './inputs.mjs'

const { files, read } = articleFiles(process.argv[2])

const unreadable = []
const mismatched = []

for (const name of files) {
	let data
	try {
		data = readFrontMatter(read(name))
	} catch (error) {
		unreadable.push(`${name}: ${error.message}`)
		continue
	}

	const result = articleSchema.safeParse(data)
	if (result.success) continue

	for (const issue of result.error.issues) {
		const where = issue.path.join('.')
		mismatched.push(`${name}: ${where === '' ? '' : `${where}: `}${issue.message}`)
	}
}

const indented = (lines) => lines.map((line) => `  ${line}`)

const report = [
	...(unreadable.length > 0
		? ['フロントマターを YAML として読めない:', ...indented(unreadable)]
		: []),
	...(mismatched.length > 0
		? ['フロントマターがスキーマ（content.schema.ts）に合わない:', ...indented(mismatched)]
		: []),
]

if (report.length > 0) fail(...report)

console.log(`✔ all frontmatter matches the schema (${files.length} articles)`)
