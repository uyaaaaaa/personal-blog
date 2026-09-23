import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-comments.mjs', import.meta.url))

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-comments-'))
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const write = (name, source) => {
	const path = join(root, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, source)
}

const check = () => spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })

const fails = (name, source) => {
	write(name, source)
	const { status, stderr } = check()
	expect(status).toBe(1)
	expect(stderr).toContain(`${name}:`)
}

describe('check-comments', () => {
	it('1行のコメントと、空行やコードで隔てたコメントを通す', () => {
		write('a.ts', '// 一\nconst a = 1\n\n// 二\n\n// 三\nexport default a\n')
		write('b.mjs', 'const a = 1 // 一\nconst b = 2 // 二\nexport { a, b }\n')
		write(
			'c.vue',
			'<template>\n\t<!-- 一 -->\n\t<div />\n</template>\n<style>\n/* 一 */\na {\n}\n</style>\n',
		)
		write(
			'e.vue',
			'<template><div /></template>\n<style>\n/* 一 */\n\n/* 二 */\na {\n}\n</style>\n',
		)
		write('d.yml', 'on: push\n# 一\njobs: {}\n')
		write('.githooks/pre-commit', '#!/bin/sh\n# 一\nexit 0\n')
		expect(check().status).toBe(0)
	})

	it('規約の適用先に無い拡張子は読まない', () => {
		write('a.tsx', 'export default <div />\n// 一\n// 二\n')
		expect(check().status).toBe(0)
	})

	it('複数行にわたるディレクティブは数えない', () => {
		write(
			'a.mjs',
			'/* eslint-disable no-console --\n  第三者由来 */\n// @ts-expect-error 型が無い\nconsole.log(1)\n',
		)
		expect(check().status).toBe(0)
	})

	it('続けて並べた行コメントを落とす', () => {
		fails('a.ts', '// 一\n// 二\nexport default 1\n')
	})

	it('コードの後ろから次の行へ続けたコメントを落とす', () => {
		fails('a.mjs', 'const a = 1 // 一\n// 二\nexport default a\n')
	})

	it('複数行のブロックコメントを落とす', () => {
		fails('a.mjs', '/**\n * 一\n */\nexport default 1\n')
	})

	it('.vue のスクリプト・テンプレート・スタイルのどれでも落とす', () => {
		fails(
			'a.vue',
			'<template><div /></template>\n<script setup lang="ts">\n// 一\n// 二\n</script>\n',
		)
		rmSync(join(root, 'a.vue'))
		fails('b.vue', '<template>\n\t<!-- 一\n\t二 -->\n\t<div />\n</template>\n')
		rmSync(join(root, 'b.vue'))
		fails('c.vue', '<template><div /></template>\n<style>\n/* 一\n   二 */\na {\n}\n</style>\n')
	})

	it('YAML とフックの # を続けた行を落とす', () => {
		fails('a.yml', '# 一\n# 二\non: push\n')
		rmSync(join(root, 'a.yml'))
		fails('.githooks/commit-msg', '#!/bin/sh\n# 一\n# 二\nexit 0\n')
	})

	it('解析できないファイルは理由を出して落ちる', () => {
		write('a.ts', 'const = = =\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ソースとして解析できない/)
	})
})
