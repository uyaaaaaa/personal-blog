import { fail, inputs } from './check-io.mjs'

const { read, entries, json, exists } = inputs(process.argv[2])
const TESTS = 'tests'
const HOOKS = '.githooks'
const SETTINGS = ['.claude/settings.json', '.claude/settings.local.json']
const IGNORED = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', '.verify'])

const walk = (directory) =>
	entries(directory).flatMap((entry) => {
		if (IGNORED.has(entry.name)) return []
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		return entry.isDirectory() ? walk(path) : [path]
	})

// vitest の既定の include に合わせる。名前を .spec. にして検査から外れる道を作らない
const TEST = /^(.*)\.(?:test|spec)\.([cm]?[jt]sx?)$/

// vitest の既定の exclude は *.config.* をテストごと落とす。設定ファイルのテストは
// eslint-config.test.mjs のようにハイフンで名乗るので、実装は元の名前でも探す
const sourcesOf = (test) => {
	const [, name, extension] = test.match(TEST)
	const names = [name, name.replace(/-config$/, '.config')]
	return [
		...new Set(
			names.flatMap((it) =>
				extension === 'ts' ? [`${it}.ts`, `${it}.vue`] : [`${it}.${extension}`],
			),
		),
	]
}

// 探す側も TEST と同じ綴りを見る。方向によって通る入力が変わらないようにする
const testsOf = (source) =>
	['test', 'spec'].map((kind) => `${TESTS}/${source.replace(/\.([cm]?[jt]sx?)$/, `.${kind}.$1`)}`)

const PROJECT_DIR = /\$(?:CLAUDE_PROJECT_DIR\b|\{CLAUDE_PROJECT_DIR\})/g
const bare = (source) => source.replace(/["']/g, '').replace(PROJECT_DIR, '')

const CHECK = /node\s+(?:-\S*\s+)*\.?\/?((?:scripts|\.claude\/hooks)\/[^\s;&|<>()]+\.mjs)/g
const DELEGATED = /npm run ([\w:-]+)/g

const errors = []

const hookCommands = () =>
	SETTINGS.filter(exists).flatMap((path) => {
		// 設定は手で書くので、辿る先はどの段でも欠けうる。欠けた段はコマンドを持たない
		const { hooks } = json(path) ?? {}
		return Object.values(hooks ?? {})
			.flat()
			.flatMap((matcher) => matcher?.hooks ?? [])
			.map((hook) => hook?.command)
			.filter((command) => typeof command === 'string')
	})

const runners = () => {
	const { scripts } = json('package.json')
	const queue = [
		scripts.lint,
		...entries(HOOKS).map((entry) => read(`${HOOKS}/${entry.name}`)),
		...hookCommands(),
	]

	const sources = []
	const seen = new Set()
	while (queue.length > 0) {
		const source = queue.pop()
		sources.push(source)
		for (const [, name] of source.matchAll(DELEGATED)) {
			if (seen.has(name) || !Object.hasOwn(scripts, name)) continue
			seen.add(name)
			queue.push(scripts[name])
		}
	}
	return sources
}

const tests = walk('').filter((path) => TEST.test(path))
const checks = [
	...new Set(
		runners().flatMap((source) => [...bare(source).matchAll(CHECK)].map(([, path]) => path)),
	),
]

for (const test of tests) {
	if (!test.startsWith(`${TESTS}/`)) {
		errors.push(`${test}: テストは ${TESTS}/ に実装の構成をミラーして置く`)
		continue
	}

	const sources = sourcesOf(test.slice(TESTS.length + 1))
	if (sources.some(exists)) continue

	errors.push(`${test}: 対応する実装が無い（${sources.join(' / ')}）`)
}

for (const check of checks) {
	const candidates = testsOf(check)
	if (candidates.some(exists)) continue

	errors.push(`${check}: 回している検査に対応するテストが無い（${candidates.join(' / ')}）`)
}

if (errors.length > 0) {
	fail('テストと実装の対応が取れていない:', ...errors.map((error) => `  ${error}`))
}

console.log(
	`✔ tests and sources mirror each other (${tests.length} tests, ${checks.length} checks)`,
)
