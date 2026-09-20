import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const CONFIG = 'eslint.config.mjs'
const COMPONENTS = 'app/components'

// 行き先として読むのは「layout / article / …」と並ぶところだけ。URL の / は前後に空白が無い
const LISTED = /[a-z][a-z\d-]*(?: \/ [a-z][a-z\d-]*)+/g

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

const load = async (path) => {
	try {
		return await import(pathToFileURL(join(ROOT, path)).href)
	} catch (error) {
		fail(`${path} を読み取れない:`, `  ${error.message}`)
	}
}

// 領域はディレクトリ。直下のファイルは検査が落とす側なので、行き先には数えない
const areas = () => {
	try {
		return readdirSync(join(ROOT, COMPONENTS), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
	} catch (error) {
		fail(`${COMPONENTS}/ を読み取れない:`, `  ${error.message}`)
	}
}

const { AREA_DIRECTORY_MESSAGE: message } = await load(CONFIG)

if (typeof message !== 'string') {
	fail(`${CONFIG} が AREA_DIRECTORY_MESSAGE を export していない`)
}

const lists = message.match(LISTED) ?? []
if (lists.length !== 1) {
	fail(
		`${CONFIG} の AREA_DIRECTORY_MESSAGE から行き先を読み取れない:`,
		`  行き先は「a / b / c」と1箇所に並べる（読めた並びは ${lists.length} 箇所）`,
		`  ${message}`,
	)
}

const listed = lists[0].split(' / ')
const actual = areas()

const unlisted = actual.filter((name) => !listed.includes(name))
const gone = listed.filter((name) => !actual.includes(name))

if (unlisted.length > 0 || gone.length > 0) {
	fail(
		`検査が挙げる行き先が ${COMPONENTS}/ の領域と違う:`,
		...unlisted.map((name) => `  ${name}: ${COMPONENTS}/ にあるが ${CONFIG} が挙げていない`),
		...gone.map((name) => `  ${name}: ${CONFIG} が挙げているが ${COMPONENTS}/ に無い`),
	)
}

console.log(`✔ the listed areas match ${COMPONENTS} (${listed.length} areas)`)
