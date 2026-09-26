import { fail, ignores, inputs } from './inputs.mjs'

const { read, entries, json, exists } = inputs(process.argv[2])
const TESTS = 'tests'
const HOOKS = '.githooks'
const SETTINGS = ['.claude/settings.json', '.claude/settings.local.json']
const IGNORED = new Set(ignores)

const walk = (directory) =>
	entries(directory).flatMap((entry) => {
		if (IGNORED.has(entry.name)) return []
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		return entry.isDirectory() ? walk(path) : [path]
	})

const TEST = /^(.*)\.(?:test|spec)\.([cm]?[jt]sx?)$/

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

const testsOf = (source) =>
	['test', 'spec'].map((kind) => `${TESTS}/${source.replace(/\.([cm]?[jt]sx?)$/, `.${kind}.$1`)}`)

const PROJECT_DIR = /\$(?:CLAUDE_PROJECT_DIR\b|\{CLAUDE_PROJECT_DIR\})/g
const bare = (source) => source.replace(/["']/g, '').replace(PROJECT_DIR, '')

const CHECK = /node\s+(?:-\S*\s+)*\.?\/?((?:scripts|\.claude\/hooks)\/[^\s;&|<>()]+\.mjs)/g
const DELEGATED = /npm run ([\w:-]+)/g

const errors = []

const hookCommands = () =>
	SETTINGS.filter(exists).flatMap((path) => {
		const { hooks } = json(path) ?? {}
		return Object.values(hooks ?? {})
			.flat()
			.flatMap((matcher) => matcher?.hooks ?? [])
			.map((hook) => hook?.command)
			.filter((command) => typeof command === 'string')
	})

const runners = () => {
	const { scripts } = json('package.json') ?? {}
	if (typeof scripts?.lint !== 'string') fail('package.json が scripts.lint を持たない')

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
