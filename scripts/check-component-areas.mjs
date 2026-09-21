import { join } from 'node:path'
import { ESLint } from 'eslint'
import { fail, inputs } from './check-io.mjs'

const { root: ROOT, entries, load } = inputs(process.argv[2])
const CONFIG = 'eslint.config.mjs'
const COMPONENTS = 'app/components'
const ERROR = 2

// 規約が成り立つ経路は文面と対象の2つ。対象は拡張子と根で設定が分かれるので、組み合わせで見る
const PLACED = ['Probe.vue', 'probe.ts']
const ROOTS = [COMPONENTS, `tests/${COMPONENTS}`]

// 領域はディレクトリ。直下のファイルは検査が落とす側なので、行き先には数えない
const directories = () =>
	entries(COMPONENTS)
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)

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

for (const root of ROOTS) {
	for (const name of PLACED) {
		const placed = `${root}/${name}`
		if ((await reports(placed)) !== 1) {
			errors.push(`${placed}: 直下に置いても文面の error が1件出ない`)
		}
		for (const area of found) {
			const inside = `${root}/${area}/${name}`
			if ((await reports(inside)) > 0) {
				errors.push(`${inside}: 領域の中なのに文面が出る`)
			}
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
