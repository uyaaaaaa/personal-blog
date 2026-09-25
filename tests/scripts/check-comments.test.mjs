import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { check as run } from '~~/scripts/check-comments.mjs'
import { inProcess } from './inProcess.test-helper.mjs'

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

const check = () => inProcess(run, root)

const fails = async (name, source) => {
	write(name, source)
	const { status, stderr } = await check()
	expect(status).toBe(1)
	expect(stderr).toContain(`${name}:`)
}

describe('check-comments', () => {
	it('1行のコメントと、空行やコードで隔てたコメントを通す', async () => {
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
		write('.githooks/pre-commit', '#!/bin/sh\n# 一\necho "a # b" ${#x}\n# 二\nexit 0\n')
		expect((await check()).status).toBe(0)
	})

	it('規約の適用先に無い拡張子は読まない', async () => {
		write('a.tsx', 'export default <div />\n// 一\n// 二\n')
		expect((await check()).status).toBe(0)
	})

	it('複数行にわたるディレクティブは数えない', async () => {
		write(
			'a.mjs',
			'/// <reference types="a" />\n/// <reference types="b" />\n/* eslint-disable no-console --\n  第三者由来 */\n// @ts-expect-error 型が無い\nconsole.log(1)\n',
		)
		expect((await check()).status).toBe(0)
	})

	it('ディレクティブに似ただけの説明は通常のコメントとして数える', async () => {
		await fails('a.mjs', '// eslint-disable が届く先の話\n// 続き\nexport default 1\n')
	})

	it('続けて並べた行コメントを落とす', async () => {
		await fails('a.ts', '// 一\n// 二\nexport default 1\n')
	})

	it('コードの後ろから次の行へ続けたコメントを落とす', async () => {
		await fails('a.mjs', 'const a = 1 // 一\n// 二\nexport default a\n')
	})

	it('複数行のブロックコメントを落とす', async () => {
		await fails('a.mjs', '/**\n * 一\n */\nexport default 1\n')
	})

	it('.vue のスクリプト・テンプレート・スタイルのどれでも落とす', async () => {
		await fails(
			'a.vue',
			'<template><div /></template>\n<script setup lang="ts">\n// 一\n// 二\n</script>\n',
		)
		rmSync(join(root, 'a.vue'))
		await fails('b.vue', '<template>\n\t<!-- 一\n\t二 -->\n\t<div />\n</template>\n')
		rmSync(join(root, 'b.vue'))
		await fails(
			'c.vue',
			'<template><div /></template>\n<style>\n/* 一\n   二 */\na {\n}\n</style>\n',
		)
	})

	it('YAML とフックの # を続けた行を落とす', async () => {
		await fails('a.yml', '# 一\n# 二\non: push\n')
		rmSync(join(root, 'a.yml'))
		await fails('.githooks/commit-msg', '#!/bin/sh\n# 一\n# 二\nexit 0\n')
		rmSync(join(root, '.githooks/commit-msg'))
		await fails('.githooks/pre-commit', 'exit 0 # 一\n# 二\n')
	})

	it('YAML のブロックスカラーに並んだ # は値として通し、行末のコメントは数える', async () => {
		write('a.yml', 'body: |\n  # 一\n  # 二\n')
		expect((await check()).status).toBe(0)
		await fails('b.yml', 'on: push # 一\n# 二\njobs: {}\n')
	})

	it('フックのヒアドキュメントと、規約の適用先に無い .yaml は読まない', async () => {
		write('.githooks/commit-msg', "cat <<'EOF'\n# 一\n# 二\nEOF\nexit 0\n")
		write('a.yaml', '# 一\n# 二\non: push\n')
		expect((await check()).status).toBe(0)
	})

	it('フックの記号を含む区切りのヒアドキュメントを読み飛ばす', async () => {
		write('.githooks/pre-commit', "cat <<'END-TEXT'\n# 一\n# 二\nEND-TEXT\nexit 0\n")
		expect((await check()).status).toBe(0)
	})

	it('フックの複数のヒアドキュメントを順番に読み飛ばす', async () => {
		write(
			'.githooks/pre-commit',
			'cat <<FIRST <<SECOND\n# 一\n# 二\nFIRST\n# 三\n# 四\nSECOND\nexit 0\n',
		)
		expect((await check()).status).toBe(0)
	})

	it('フックのヒアドキュメントの後ろに続くコメントを数える', async () => {
		await fails(
			'.githooks/pre-commit',
			"cat <<'END-TEXT'\n# 本文一\n# 本文二\nEND-TEXT\n# 一\n# 二\nexit 0\n",
		)
	})

	it('フックの算術シフトと here-string をヒアドキュメントとして扱わない', async () => {
		await fails('.githooks/pre-commit', 'value=$((1 << 2))\n# 一\n# 二\nexit 0\n')
		rmSync(join(root, '.githooks/pre-commit'))
		await fails('.githooks/commit-msg', 'read value <<< input\n# 一\n# 二\nexit 0\n')
	})

	it('フックの複数行にわたる引用符の中をコメントとして扱わない', async () => {
		write('.githooks/pre-commit', `printf '%s' "\n# 一\n# 二\n"\nexit 0\n`)
		expect((await check()).status).toBe(0)
	})

	it('.githooks の下の入れ子のファイルも読む', async () => {
		await fails('.githooks/lib/check', '# 一\n# 二\nexit 0\n')
	})

	it('解析できないファイルは理由を出して落ちる', async () => {
		write('a.ts', 'const = = =\n')
		const { status, stderr } = await check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ソースとして解析できない/)
	})

	it('CLI として引数のディレクトリを見て、落ちれば終了コード 1 を返す', () => {
		write('a.mjs', '// 一\n// 二\nexport default 1\n')
		const { status, stderr } = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' })
		expect(status).toBe(1)
		expect(stderr).toMatch(/a\.mjs:1: 2行にわたっている/)
	})
})
