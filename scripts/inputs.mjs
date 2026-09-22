import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

export const loaded = async (specifier, where = specifier) => {
	try {
		return await import(specifier)
	} catch (error) {
		fail(`${where} を読み取れない:`, `  ${error.message}`)
	}
}

export const ignores = ['.git', '.nuxt', '.output', '.verify', 'dist', 'node_modules']

export const inputs = (given) => {
	const root = resolve(given ?? fileURLToPath(new URL('..', import.meta.url)))
	const at = (path) => resolve(root, path)

	const read = (path) => {
		try {
			return readFileSync(at(path), 'utf8')
		} catch (error) {
			fail(`${path} を読み取れない:`, `  ${error.message}`)
		}
	}

	return {
		root,
		read,
		entries: (path, options) => {
			try {
				return readdirSync(at(path), { withFileTypes: true, ...options })
			} catch (error) {
				fail(`${path === '' ? '.' : path}/ を読み取れない:`, `  ${error.message}`)
			}
		},
		json: (path) => {
			try {
				return JSON.parse(read(path))
			} catch (error) {
				fail(`${path} を JSON として読めない:`, `  ${error.message}`)
			}
		},
		exists: (path) => existsSync(at(path)),
		load: (path) => loaded(pathToFileURL(at(path)).href, path),
	}
}
