import { readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_DIR = fileURLToPath(new URL('../content/article', import.meta.url))

// 記事は /article/<スラッグ> の1階層にしか載らず、下の階層に置くと prerender が 404 で落ちる
export const NESTED = '記事は content/article の直下に置く:'

export const articleFiles = (given) => {
	const dir = resolve(given ?? DEFAULT_DIR)
	const found = readdirSync(dir, { recursive: true, withFileTypes: true }).filter(
		(entry) => entry.isFile() && entry.name.endsWith('.md'),
	)

	return {
		dir,
		files: found.filter((entry) => entry.parentPath === dir).map((entry) => entry.name),
		nested: found
			.filter((entry) => entry.parentPath !== dir)
			.map((entry) => join(relative(dir, entry.parentPath), entry.name)),
	}
}
