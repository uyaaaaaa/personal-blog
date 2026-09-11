import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tagToSlug } from '../app/utils/tag.ts'
import { articleFiles, fail } from './article-files.mjs'

const readFrontmatter = (source) => {
	const matched = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
	return matched ? matched[1] : null
}

const readTags = (frontmatter, file) => {
	const lines = frontmatter.split(/\r?\n/)
	const start = lines.findIndex((line) => /^tags:/.test(line))
	if (start === -1) return []

	const inline = lines[start].slice('tags:'.length).trim()
	if (inline !== '') {
		throw new Error(`${file}: tags は1行1件のリストで書く（${lines[start].trim()}）`)
	}

	const tags = []
	for (const line of lines.slice(start + 1)) {
		if (/^\S/.test(line)) break
		const item = line.match(/^\s+-\s+(.*)$/)
		if (!item) {
			throw new Error(`${file}: tags の項目として読めない行がある（${line.trim()}）`)
		}
		tags.push(item[1].trim().replace(/^(['"])(.*)\1$/, '$2'))
	}
	return tags
}

const { dir, files } = articleFiles(process.argv[2])

const owners = new Map()
try {
	for (const name of files) {
		const frontmatter = readFrontmatter(readFileSync(join(dir, name), 'utf8'))
		if (frontmatter === null) continue
		for (const tag of readTags(frontmatter, name)) {
			if (!owners.has(tag)) owners.set(tag, name)
		}
	}
} catch (error) {
	fail('タグを読み取れない:', `  ${error.message}`)
}

const bySlug = new Map()
for (const tag of owners.keys()) {
	const slug = tagToSlug(tag)
	if (!bySlug.has(slug)) bySlug.set(slug, [])
	bySlug.get(slug).push(tag)
}

const errors = []
for (const [slug, tags] of bySlug) {
	const where = tags.map((tag) => `"${tag}" (${owners.get(tag)})`).join(' と ')
	if (slug === '') {
		errors.push(`${where} は英数字を含まないためスラッグが空になる`)
	} else if (tags.length > 1) {
		errors.push(`${where} が同じスラッグ "${slug}" になる`)
	}
}

if (errors.length > 0) {
	fail('タグからURLのスラッグを一意に作れない:', ...errors.map((error) => `  ${error}`))
}

console.log(`✔ no tag slug conflicts found (${owners.size} tags, ${bySlug.size} slugs)`)
