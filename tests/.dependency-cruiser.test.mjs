import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cruise } from 'dependency-cruiser'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import configuration from '../.dependency-cruiser.mjs'
import { COMPONENT_AREAS } from '../eslint.config.mjs'

const COMPONENTS = 'app/components'
const ROOTS = [COMPONENTS, `tests/${COMPONENTS}`]
const CRUISED = ['app', 'tests']
const UI = 'ui'
const PROBE = 'probe.mjs'

const cases = ROOTS.flatMap((root) =>
	COMPONENT_AREAS.flatMap((from) => COMPONENT_AREAS.map((to) => ({ root, from, to }))),
)

const importer = ({ root, from, to }) => `${root}/${from}/to-${to}.mjs`

const expected = ({ from, to }) => {
	if (from === to || to === UI) return []
	return from === UI ? ['ui-no-domains'] : ['component-domains-isolated']
}

const crossing = cases.filter((it) => expected(it).length > 0)
const inside = cases.filter((it) => expected(it).length === 0)

let root
let violations

beforeAll(async () => {
	root = mkdtempSync(join(tmpdir(), 'dependency-cruiser-'))
	for (const directory of ROOTS) {
		for (const area of COMPONENT_AREAS) {
			mkdirSync(join(root, directory, area), { recursive: true })
			writeFileSync(join(root, directory, area, PROBE), 'export const probe = null\n')
		}
	}
	for (const it of cases) {
		writeFileSync(join(root, importer(it)), `import '../${it.to}/${PROBE}'\n`)
	}

	const { output } = await cruise(CRUISED, {
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
	subset.map((it) => [
		importer(it),
		violations.filter((found) => found.from === importer(it)).map((found) => found.rule.name),
	])

const wanted = (subset) => subset.map((it) => [importer(it), expected(it)])

describe('.dependency-cruiser', () => {
	it('領域どうしの import は、挙げているどの領域からでも落ちる', () => {
		expect(reported(crossing)).toEqual(wanted(crossing))
	})

	it('同じ領域の中と ui への import は通す', () => {
		expect(reported(inside)).toEqual(wanted(inside))
	})
})
