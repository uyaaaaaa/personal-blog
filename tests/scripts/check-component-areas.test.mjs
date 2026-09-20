import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-component-areas.mjs', import.meta.url))
const AREAS = ['layout', 'article', 'content', 'error', 'ui']
const FILES = ['app/components/*.{vue,ts}']

// 仮の設定は temp に置くので、パーサは名前では解決されない。綴りの解決はここで済ませる
const PARSER = pathToFileURL(createRequire(import.meta.url).resolve('vue-eslint-parser')).href

let root

const components = (...names) => {
	for (const name of names) mkdirSync(join(root, 'app/components', name), { recursive: true })
}

const sentence = (areas) =>
	`components/ の直下にファイルを置かない。${areas.join(' / ')} のいずれかに入れる。`

const config = ({
	areas = AREAS,
	message = sentence(areas),
	files = FILES,
	severity = 'error',
	selector = 'Program',
} = {}) =>
	writeFileSync(
		join(root, 'eslint.config.mjs'),
		[
			`import parser from ${JSON.stringify(PARSER)}`,
			`export const COMPONENT_AREAS = ${JSON.stringify(areas)}`,
			`export const AREA_DIRECTORY_MESSAGE = ${JSON.stringify(message)}`,
			`export default [{ files: ${JSON.stringify(files)}, languageOptions: { parser },` +
				` rules: { 'no-restricted-syntax': [${JSON.stringify(severity)},` +
				` { selector: ${JSON.stringify(selector)}, message: AREA_DIRECTORY_MESSAGE }] } }]`,
			'',
		].join('\n'),
	)

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-component-areas-'))
	components(...AREAS)
	config()
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('check-component-areas', () => {
	it('挙げる行き先と当たる対象が揃っていれば通す', () => {
		expect(check().status).toBe(0)
	})

	it('直下のファイルは行き先に数えない', () => {
		writeFileSync(join(root, 'app/components/Header.vue'), '<template><div /></template>\n')
		expect(check().status).toBe(0)
	})

	it('領域が増えて一覧が据え置きなら落とす', () => {
		components('search')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/search: app\/components\/ にあるが/)
	})

	it('無い領域を挙げていれば落とす', () => {
		config({ areas: [...AREAS, 'common'] })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/common: eslint\.config\.mjs が挙げている/)
	})

	it('挙げた領域が文面に出てこなければ落とす', () => {
		config({ message: 'components/ の直下にファイルを置かない。' })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ui: 挙げている領域が文面に出てこない/)
	})

	it('当たる対象を拡張子で狭めれば落とす', () => {
		config({ files: ['app/components/*.vue'] })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/probe\.ts: 直下に置いても文面の error が1件出ない/)
	})

	it('当たる対象を領域の中まで広げれば落とす', () => {
		config({ files: ['app/components/**/*.{vue,ts}'] })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ui\/Probe\.vue: 領域の中なのに文面が出る/)
	})

	it('error から warn に下げれば落とす', () => {
		config({ severity: 'warn' })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/Probe\.vue: 直下に置いても文面の error が1件出ない/)
	})

	it('当たらない selector に変えれば落とす', () => {
		config({ selector: 'ClassDeclaration' })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/Probe\.vue: 直下に置いても文面の error が1件出ない/)
	})

	it('一覧を export していなければ落とす', () => {
		writeFileSync(join(root, 'eslint.config.mjs'), 'export default []\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/COMPONENT_AREAS を文字列の配列として export していない/)
	})
})
