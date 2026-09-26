import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cruise } from 'dependency-cruiser'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import configuration from '../.dependency-cruiser.mjs'
import { COMPONENT_AREAS } from '../eslint.config.mjs'

const COMPONENTS = 'app/components'
const ROOTS = [COMPONENTS, `tests/${COMPONENTS}`]
const CRUISED = ['app', 'tests']
const UI = 'ui'
const PROBE = 'probe.mjs'

const pairs = ROOTS.flatMap((root) =>
	COMPONENT_AREAS.flatMap((from) => COMPONENT_AREAS.map((to) => ({ root, from, to }))),
)

const importer = ({ root, from, to }) => `${root}/${from}/to-${to}.mjs`

const expected = ({ from, to }) => {
	if (from === to || to === UI) return []
	return from === UI ? ['ui-no-domains'] : ['component-domains-isolated']
}

const crossing = pairs.filter((pair) => expected(pair).length > 0)
const inside = pairs.filter((pair) => expected(pair).length === 0)

let root
let violations

beforeAll(async () => {
	// macOS の tmpdir はシンボリックリンク越しで、解決先は実体の経路になる。baseDir も実体に揃える
	root = realpathSync(mkdtempSync(join(tmpdir(), 'dependency-cruiser-')))
	for (const directory of ROOTS) {
		for (const area of COMPONENT_AREAS) {
			mkdirSync(join(root, directory, area), { recursive: true })
			writeFileSync(join(root, directory, area, PROBE), 'export const probe = null\n')
		}
	}
	for (const pair of pairs) {
		writeFileSync(join(root, importer(pair)), `import '../${pair.to}/${PROBE}'\n`)
	}

	const { output } = await cruise(CRUISED, {
		...configuration.options,
		baseDir: root,
		validate: true,
		ruleSet: { forbidden: configuration.forbidden },
	})
	violations = output.summary.violations
})

afterAll(() => {
	rmSync(root, { recursive: true, force: true })
})

const reported = (subset) =>
	subset.map((pair) => [
		importer(pair),
		violations.filter((found) => found.from === importer(pair)).map((found) => found.rule.name),
	])

const wanted = (subset) => subset.map((pair) => [importer(pair), expected(pair)])

describe('.dependency-cruiser', () => {
	it('領域どうしの import は、挙げているどの領域からでも落ちる', () => {
		expect(reported(crossing)).toEqual(wanted(crossing))
	})

	it('同じ領域の中と ui への import は通す', () => {
		expect(reported(inside)).toEqual(wanted(inside))
	})
})

const loading = async (areas) => {
	vi.resetModules()
	vi.doMock('../eslint.config.mjs', () => ({ COMPONENT_AREAS: areas }))
	return import('../.dependency-cruiser.mjs')
}

const unusable = [
	{ how: '領域でない綴りが混ざる', areas: ['layout', 'article|x', UI], reason: /配列でない/ },
	{ how: '文字列でないものが混ざる', areas: ['layout', 42, UI], reason: /配列でない/ },
	{ how: '配列ですらない', areas: undefined, reason: /配列でない/ },
	{ how: 'ui が挙がっていない', areas: ['layout', 'article'], reason: /に ui が無い/ },
	{ how: 'ui しか挙がっていない', areas: [UI], reason: /以外の領域を挙げていない/ },
]

describe('領域の一覧', () => {
	afterEach(() => {
		vi.doUnmock('../eslint.config.mjs')
		vi.resetModules()
	})

	it.each(unusable)('$how なら理由を出して止まる', async ({ areas, reason }) => {
		await expect(loading(areas)).rejects.toThrow(reason)
	})

	it('挙げた領域が、そのまま規則の綴りになる', async () => {
		const { default: derived } = await loading(['search', 'layout', UI])
		const derives = ['component-domains-isolated', 'ui-no-domains']
		expect(
			derived.forbidden
				.filter((rule) => derives.includes(rule.name))
				.map((rule) => rule.from.path),
		).toEqual([
			expect.stringContaining(`${COMPONENTS}/(search|layout)/`),
			expect.stringContaining(`${COMPONENTS}/${UI}/`),
		])
	})
})
