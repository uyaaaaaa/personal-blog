import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-token-copies.mjs', import.meta.url))

const BG = '#FAFAF8'
const LIGHT_FOREGROUND = '#24292E'
const DARK_FOREGROUND = '#E1E4E8'
const THEMES = "{ default: 'github-light', dark: 'github-dark' }"

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-token-copies-'))
	mkdirSync(join(root, 'theme'))
	mkdirSync(join(root, 'public'))
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const tokens = ({ bg = BG, light = LIGHT_FOREGROUND, dark = DARK_FOREGROUND } = {}) => {
	writeFileSync(
		join(root, 'theme/tokens.ts'),
		`export const colors = { bg: '${bg}', 'code-text': '${light}' } as const\n` +
			`export const darkColors: Record<keyof typeof colors, string> = ` +
			`{ bg: '#141414', 'code-text': '${dark}' }\n`,
	)
}

const manifest = ({ theme = BG, background = BG } = {}) => {
	writeFileSync(
		join(root, 'public/site.webmanifest'),
		JSON.stringify({ theme_color: theme, background_color: background }),
	)
}

const config = (theme = THEMES) => {
	writeFileSync(
		join(root, 'nuxt.config.ts'),
		`export default defineNuxtConfig({\n` +
			`\tcontent: { build: { markdown: { highlight: { ` +
			`${theme === null ? '' : `theme: ${theme}, `}langs: [] } } } },\n` +
			`})\n`,
	)
}

const all = (overrides = {}) => {
	tokens(overrides.tokens)
	manifest(overrides.manifest)
	config(overrides.theme)
}

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

describe('check-token-copies', () => {
	it('写しが揃っていれば通す', () => {
		all()
		expect(check().status).toBe(0)
	})

	it('綴りの大文字小文字は違いとして見ない', () => {
		all({ tokens: { light: '#24292e', dark: '#e1e4e8' }, manifest: { theme: '#fafaf8' } })
		expect(check().status).toBe(0)
	})

	it('webmanifest の theme_color が地の色と違えば落とす', () => {
		all({ manifest: { theme: '#FFFFFF' } })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/theme_color は #FFFFFF/)
		expect(stderr).toMatch(/colors\.bg は #FAFAF8/)
	})

	it('webmanifest の background_color が地の色と違えば落とす', () => {
		all({ manifest: { background: '#FFFFFF' } })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/background_color は #FFFFFF/)
	})

	it('code-text がテーマの前景色と違えば落とす', () => {
		all({ tokens: { light: '#C9D1D9' } })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/colors\['code-text'\] は #C9D1D9/)
		expect(stderr).toMatch(/github-light の editor\.foreground は #24292e/)
	})

	it('darkColors の code-text がテーマの前景色と違えば落とす', () => {
		all({ tokens: { dark: '#E6EDF3' } })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/darkColors\['code-text'\] は #E6EDF3/)
		expect(stderr).toMatch(/github-dark の editor\.foreground は #e1e4e8/)
	})

	it('突き合わせる前景色は nuxt.config が選んだテーマから取る', () => {
		all({ theme: "{ default: 'github-dark', dark: 'github-dark' }" })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/colors\['code-text'\] は #24292E/)
		expect(stderr).toMatch(/github-dark の editor\.foreground は #e1e4e8/)
	})

	it('テーマを1つの綴りで選んでいれば明暗の両方に使う', () => {
		all({ tokens: { light: DARK_FOREGROUND }, theme: "'github-dark'" })
		expect(check().status).toBe(0)
	})

	it('highlight.theme が無ければ理由を出す', () => {
		all({ theme: null })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/highlight\.theme が無い/)
	})

	it('highlight の外の theme を正本にしない', () => {
		all({ tokens: { light: DARK_FOREGROUND }, theme: null })
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({\n` +
				`\tcontent: { build: { markdown: { highlight: { langs: [] } } } },\n` +
				`\tappConfig: { theme: 'github-dark' },\n` +
				`})\n`,
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/highlight\.theme が無い/)
	})

	it('括弧を持つ綴りが混ざっていても正本を読む', () => {
		all()
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({\n` +
				`\tcontent: { build: { markdown: { highlight: { langs: ['}'], theme: ${THEMES} } } } },\n` +
				`})\n`,
		)
		expect(check().status).toBe(0)
	})

	it('コメントの中の theme を正本にしない', () => {
		all({ tokens: { dark: LIGHT_FOREGROUND } })
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({\n` +
				`\tcontent: { build: { markdown: { highlight: {\n` +
				`\t\t// theme: { default: 'github-light', dark: 'github-light' }\n` +
				`\t\ttheme: ${THEMES}, langs: [] } } } },\n` +
				`})\n`,
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/github-dark の editor\.foreground は #e1e4e8/)
	})

	it('綴りの中の theme を正本にしない', () => {
		all({ tokens: { dark: LIGHT_FOREGROUND } })
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({\n` +
				`\tcontent: { build: { markdown: { highlight: {\n` +
				`\t\tnote: "theme: { default: 'github-light', dark: 'github-light' }",\n` +
				`\t\ttheme: ${THEMES}, langs: [] } } } },\n` +
				`})\n`,
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/github-dark の editor\.foreground は #e1e4e8/)
	})

	it('コメントアウトされた明暗の項目を拾わない', () => {
		all({ tokens: { dark: LIGHT_FOREGROUND } })
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({\n` +
				`\tcontent: { build: { markdown: { highlight: { theme: {\n` +
				`\t\tdefault: 'github-light',\n` +
				`\t\tdark: 'github-dark',\n` +
				`\t\t// dark: 'github-light',\n` +
				`\t} , langs: [] } } } },\n` +
				`})\n`,
		)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/github-dark の editor\.foreground は #e1e4e8/)
	})

	it('正規表現リテラルを持つ設定でも正本を読む', () => {
		all()
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({\n` +
				`\tcontent: { build: { markdown: { highlight: {\n` +
				`\t\tignore: [/['"]/],\n` +
				`\t\ttheme: ${THEMES}, langs: [] } } } },\n` +
				`})\n`,
		)
		expect(check().status).toBe(0)
	})

	it('設定が既定のエクスポートを持たなければ理由を出す', () => {
		all()
		writeFileSync(join(root, 'nuxt.config.ts'), `export const config = {}\n`)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/既定のエクスポートが無い/)
	})

	it('無いキーをそのものの名前で言う', () => {
		all()
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({ app: {} })\n`,
		)
		expect(check().stderr).toMatch(/^\s+content が無い$/m)

		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({ content: { build: { markdown: {} } } })\n`,
		)
		expect(check().stderr).toMatch(/^\s+content\.build\.markdown\.highlight が無い$/m)
	})

	it('dark を持たないテーマの指定を、綴り1本と同じに扱う', () => {
		all({ tokens: { dark: LIGHT_FOREGROUND } })
		writeFileSync(
			join(root, 'nuxt.config.ts'),
			`export default defineNuxtConfig({\n` +
				`\tcontent: { build: { markdown: { highlight: { theme: { default: 'github-light' } } } } },\n` +
				`})\n`,
		)
		expect(check().status).toBe(0)
	})

	it('正本に値が無ければ、どの写しのものか分かる理由を出す', () => {
		all()
		writeFileSync(join(root, 'theme/tokens.ts'), `export const colors = {} as const\n`)
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/theme_color の正本 theme\/tokens\.ts の colors\.bg に値が無い/)
		expect(stderr).toMatch(/background_color の正本/)
		expect(stderr).not.toMatch(/TypeError/)
	})

	it('写しの側に値が無ければ理由を出す', () => {
		all()
		writeFileSync(join(root, 'public/site.webmanifest'), '{}')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/theme_color に値が無い/)
		expect(stderr).not.toMatch(/TypeError/)
	})

	it('入っていないテーマを選んでいれば理由を出す', () => {
		all({ theme: "{ default: 'nonexistent-theme', dark: 'github-dark' }" })
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/テーマ nonexistent-theme を読み取れない/)
	})

	it('webmanifest が JSON として読めなければ理由を出す', () => {
		all()
		writeFileSync(join(root, 'public/site.webmanifest'), '{')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/JSON として読めない/)
	})

	it('tokens.ts が無ければ理由を出す', () => {
		all()
		rmSync(join(root, 'theme/tokens.ts'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/theme\/tokens\.ts を読み取れない/)
	})
})
