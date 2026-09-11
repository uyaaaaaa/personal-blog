import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const TESTS = 'tests'
const HOOKS = '.githooks'
// Claude は両方を読む。片方だけ見ると、もう片方が抜け道になる
const SETTINGS = ['.claude/settings.json', '.claude/settings.local.json']
const IGNORED = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', '.verify'])

const walk = (directory) =>
	readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
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

// command はシェルの1行。引用符と $CLAUDE_PROJECT_DIR は先に剥がし、残ったパスだけを見る。
// 綴りを並べて拾うと、並べ落とした綴り（変数の外で閉じる引用符）が抜け道になる
const PROJECT_DIR = /\$(?:CLAUDE_PROJECT_DIR\b|\{CLAUDE_PROJECT_DIR\})/g
const bare = (source) => source.replace(/["']/g, '').replace(PROJECT_DIR, '')

// scripts/ にも .claude/hooks/ にも、検査でないもの（harness-journal・session-args・probe）が
// 居る。どれが検査かは回している側が持っているので、一覧を別に作らずそこから読む
const CHECK = /node\s+(?:-\S*\s+)*\.?\/?((?:scripts|\.claude\/hooks)\/[^\s;&|<>()]+\.mjs)/g
const DELEGATED = /npm run ([\w:-]+)/g

const errors = []

// Claude が回す hook。イベント名・matcher の並びは設定側の都合なので、形を決め打ちせず
// hooks の下から command だけを集める
const hookCommands = () =>
	SETTINGS.filter((path) => existsSync(join(ROOT, path))).flatMap((path) => {
		try {
			const { hooks = {} } = JSON.parse(readFileSync(join(ROOT, path), 'utf8'))
			return Object.values(hooks)
				.flat()
				.flatMap((matcher) => matcher.hooks ?? [])
				.map((hook) => hook.command)
				.filter((command) => typeof command === 'string')
		} catch (error) {
			errors.push(`${path}: hooks を読めない（${error.message}）`)
			return []
		}
	})

// 起点は commit と lint と Claude の hook で回るものだけ。全 script を見ると、回っていない
// 検査でない scripts/ にもテストを求める。委譲した先は npm run を辿って拾う
const runners = () => {
	const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
	const queue = [
		scripts.lint,
		...readdirSync(join(ROOT, HOOKS)).map((name) =>
			readFileSync(join(ROOT, HOOKS, name), 'utf8'),
		),
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
	if (sources.some((source) => existsSync(join(ROOT, source)))) continue

	errors.push(`${test}: 対応する実装が無い（${sources.join(' / ')}）`)
}

for (const check of checks) {
	const candidates = testsOf(check)
	if (candidates.some((test) => existsSync(join(ROOT, test)))) continue

	errors.push(`${check}: 回している検査に対応するテストが無い（${candidates.join(' / ')}）`)
}

if (errors.length > 0) {
	console.error('テストと実装の対応が取れていない:')
	for (const error of errors) console.error(`  ${error}`)
	process.exit(1)
}

console.log(
	`✔ tests and sources mirror each other (${tests.length} tests, ${checks.length} checks)`,
)
