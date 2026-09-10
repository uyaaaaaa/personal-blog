import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const TESTS = 'tests'
const IGNORED = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', '.verify'])

const walk = (directory) =>
	readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
		if (IGNORED.has(entry.name)) return []
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		return entry.isDirectory() ? walk(path) : [path]
	})

// vitest の既定の include に合わせる。名前を .spec. にして検査から外れる道を作らない
const TEST = /^(.*)\.(?:test|spec)\.([cm]?[jt]sx?)$/

// コンポーネントのテストだけ拡張子が実装と揃わない（Foo.test.ts に対して Foo.vue）。
// 設定ファイルは vitest の既定の exclude が *.config.* ごと落とすので、テスト側は
// eslint-config.test.mjs のようにハイフンで名乗る。実装は元の名前でも探す
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

const tests = walk('').filter((path) => TEST.test(path))

const errors = []
for (const test of tests) {
	if (!test.startsWith(`${TESTS}/`)) {
		errors.push(`${test}: テストは ${TESTS}/ に実装の構成をミラーして置く`)
		continue
	}

	const sources = sourcesOf(test.slice(TESTS.length + 1))
	if (sources.some((source) => existsSync(join(ROOT, source)))) continue

	errors.push(`${test}: 対応する実装が無い（${sources.join(' / ')}）`)
}

if (errors.length > 0) {
	console.error('テストと実装の対応が取れていない:')
	for (const error of errors) console.error(`  ${error}`)
	process.exit(1)
}

console.log(`✔ all tests mirror a source file (${tests.length} tests)`)
