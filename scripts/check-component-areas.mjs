import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ESLint } from 'eslint'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const CONFIG = 'eslint.config.mjs'
const COMPONENTS = 'app/components'
const RULE = 'no-restricted-syntax'

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

// 当たる対象は設定の解決そのものに聞く。files の綴りを写すと、写しの側がずれる
const says = async (path) => {
	let config
	try {
		config = await eslint.calculateConfigForFile(join(ROOT, path))
	} catch (error) {
		fail(`${path} に当たる設定を読み取れない:`, `  ${error.message}`)
	}
	// どの設定にも当たらないファイルは config を持たない
	const [, ...options] = config?.rules?.[RULE] ?? [0]
	return options.some((option) => option?.message === message)
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
	if (!(await says(`${COMPONENTS}/${name}`))) {
		errors.push(`${COMPONENTS}/${name}: 直下に置いても文面が当たらない`)
	}
	for (const area of found) {
		if (await says(`${COMPONENTS}/${area}/${name}`)) {
			errors.push(`${COMPONENTS}/${area}/${name}: 領域の中なのに文面が当たる`)
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
