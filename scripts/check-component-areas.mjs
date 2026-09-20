import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ESLint } from 'eslint'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const CONFIG = 'eslint.config.mjs'
const COMPONENTS = 'app/components'
const ERROR = 2

// 規約が成り立つ経路は文面と対象の2つ。対象は拡張子ごとに設定が分かれるので、両方の綴りで見る
const PLACED = ['Probe.vue', 'probe.ts']

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
const directories = () => {
	try {
		return readdirSync(join(ROOT, COMPONENTS), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
	} catch (error) {
		fail(`${COMPONENTS}/ を読み取れない:`, `  ${error.message}`)
	}
}

const { COMPONENT_AREAS: listed, AREA_DIRECTORY_MESSAGE: message } = await load(CONFIG)

if (!Array.isArray(listed) || listed.some((name) => typeof name !== 'string')) {
	fail(`${CONFIG} が COMPONENT_AREAS を文字列の配列として export していない`)
}
if (typeof message !== 'string') {
	fail(`${CONFIG} が AREA_DIRECTORY_MESSAGE を文字列として export していない`)
}

const eslint = new ESLint({ cwd: ROOT })

// 当たる設定ではなく報告そのものを見る。設定だけを見ると severity と selector を緩めても通る
const reports = async (path) => {
	let results
	try {
		results = await eslint.lintText('', { filePath: join(ROOT, path) })
	} catch (error) {
		fail(`${path} に eslint を当てられない:`, `  ${error.message}`)
	}
	return results
		.flatMap((result) => result.messages)
		.filter((found) => found.message === message && found.severity === ERROR).length
}

const found = directories()
const errors = [
	...found
		.filter((name) => !listed.includes(name))
		.map((name) => `${name}: ${COMPONENTS}/ にあるが ${CONFIG} が挙げていない`),
	...listed
		.filter((name) => !found.includes(name))
		.map((name) => `${name}: ${CONFIG} が挙げているが ${COMPONENTS}/ に無い`),
	...listed
		.filter((name) => !message.includes(name))
		.map((name) => `${name}: 挙げている領域が文面に出てこない`),
]

for (const name of PLACED) {
	const placed = `${COMPONENTS}/${name}`
	if ((await reports(placed)) !== 1) {
		errors.push(`${placed}: 直下に置いても文面の error が1件出ない`)
	}
	for (const area of found) {
		const inside = `${COMPONENTS}/${area}/${name}`
		if ((await reports(inside)) > 0) {
			errors.push(`${inside}: 領域の中なのに文面が出る`)
		}
	}
}

if (errors.length > 0) {
	fail(
		`検査が挙げる行き先と当たる対象が ${COMPONENTS}/ と揃っていない:`,
		...errors.map((it) => `  ${it}`),
	)
}

console.log(
	`✔ the listed areas and the files they cover match ${COMPONENTS} (${listed.length} areas)`,
)
