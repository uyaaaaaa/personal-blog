import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-component-areas.mjs', import.meta.url))
const AREAS = ['layout', 'article', 'content', 'error', 'ui']

let root

const components = (...names) => {
	for (const name of names) mkdirSync(join(root, 'app/components', name), { recursive: true })
}

const message = (listed = AREAS) =>
	writeFileSync(
		join(root, 'eslint.config.mjs'),
		'export const AREA_DIRECTORY_MESSAGE = ' +
			`'components/ の直下にファイルを置かない。${listed.join(' / ')} のいずれかに入れる。 ` +
			"https://example.com/docs/ARCHITECTURE.md#層と依存方向'\n",
	)

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-component-areas-'))
	components(...AREAS)
	message()
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('check-component-areas', () => {
	it('挙げる行き先が実在する領域と揃っていれば通す', () => {
		expect(check().status).toBe(0)
	})

	it('領域が増えて文面が据え置きなら落とす', () => {
		components('search')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/search: app\/components\/ にあるが/)
	})

	it('無い領域を挙げていれば落とす', () => {
		message([...AREAS, 'common'])
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/common: eslint\.config\.mjs が挙げている/)
	})

	it('直下のファイルは行き先に数えない', () => {
		writeFileSync(join(root, 'app/components/Header.vue'), '<template><div /></template>\n')
		expect(check().status).toBe(0)
	})

	it('並びを読み取れない文面なら落とす', () => {
		writeFileSync(
			join(root, 'eslint.config.mjs'),
			"export const AREA_DIRECTORY_MESSAGE = 'components/ の直下にファイルを置かない。'\n",
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/行き先を読み取れない/)
	})

	it('文面を export していなければ落とす', () => {
		writeFileSync(join(root, 'eslint.config.mjs'), 'export default []\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/AREA_DIRECTORY_MESSAGE を export していない/)
	})
})
