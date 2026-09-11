import { readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_DIR = fileURLToPath(new URL('../content/article', import.meta.url))

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

// 記事は /article/<スラッグ> の1階層にしか載らず、下の階層に置くと prerender が 404 で落ちる
export const articleFiles = (given) => {
	const dir = resolve(given ?? DEFAULT_DIR)

	let found
	try {
		found = readdirSync(dir, { recursive: true, withFileTypes: true }).filter(
			(entry) => entry.isFile() && entry.name.endsWith('.md'),
		)
	} catch (error) {
		fail('記事のディレクトリを読み取れない:', `  ${error.message}`)
	}

	const nested = found.filter((entry) => entry.parentPath !== dir)
	if (nested.length > 0) {
		fail(
			'記事は content/article の直下に置く:',
			...nested.map((entry) => `  ${join(relative(dir, entry.parentPath), entry.name)}`),
		)
	}

	return { dir, files: found.map((entry) => entry.name) }
}
