import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cruise } from 'dependency-cruiser'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import configuration from '../.dependency-cruiser.mjs'
import { COMPONENT_AREAS } from '../eslint.config.mjs'

const COMPONENTS = 'app/components'
const UI = 'ui'
const PROBE = 'probe.mjs'

const pairs = COMPONENT_AREAS.flatMap((from) => COMPONENT_AREAS.map((to) => ({ from, to })))

const importer = ({ from, to }) => `${COMPONENTS}/${from}/to-${to}.mjs`

const expected = ({ from, to }) => {
	if (from === to || to === UI) return []
	return from === UI ? ['ui-no-domains'] : ['component-domains-isolated']
}

const crossing = pairs.filter((pair) => expected(pair).length > 0)
const inside = pairs.filter((pair) => expected(pair).length === 0)

let root
let violations

beforeAll(async () => {
	root = mkdtempSync(join(tmpdir(), 'dependency-cruiser-'))
	for (const area of COMPONENT_AREAS) {
		mkdirSync(join(root, COMPONENTS, area), { recursive: true })
		writeFileSync(join(root, COMPONENTS, area, PROBE), 'export const probe = null\n')
	}
	for (const pair of pairs) {
		writeFileSync(join(root, importer(pair)), `import '../${pair.to}/${PROBE}'\n`)
	}

	const { output } = await cruise([COMPONENTS], {
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
		violations.filter((it) => it.from === importer(pair)).map((it) => it.rule.name),
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
