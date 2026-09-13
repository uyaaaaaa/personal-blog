import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-eslint-suppression.mjs', import.meta.url))

let root

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'check-eslint-suppression-'))
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

const sfc = (script) => `<template><div /></template>\n<script setup lang="ts">${script}</script>\n`

describe('check-eslint-suppression', () => {
	it('ルール名と理由の揃った抑制を通す', () => {
		write('a.mjs', '/* eslint-disable no-console -- 第三者由来 */\nconsole.log(1)\n')
		write('b.ts', '// eslint-disable-next-line no-console -- 第三者由来\nconsole.log(1)\n')
		write('c.vue', sfc('/* eslint-disable style/no-important -- 第三者由来 */'))
		expect(check().status).toBe(0)
	})

	it('ルール名の無い抑制を落とす', () => {
		write('a.mjs', '/* eslint-disable -- 第三者由来 */\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ルール名を書く/)
	})

	it('理由の無い抑制を落とす', () => {
		write('a.vue', sfc('/* eslint-disable style/no-important */'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/理由を -- の後ろに書く/)
	})

	it('文字列に書いた綴りと、効かない行コメントは数えない', () => {
		write('a.mjs', "const code = '/* eslint-disable */'\nexport default code\n")
		write('b.mjs', '// eslint-disable が届く先の話\nexport default 1\n')
		expect(check().status).toBe(0)
	})

	it('重さを書き換えるインラインの設定を落とす', () => {
		write('a.vue', sfc('/* eslint style/no-important: "off" */'))
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/ルールの重さをここで変えない/)
	})

	it('綴りの重なるディレクティブは数えない', () => {
		write('a.mjs', '/* eslint-env browser */\n/* globals window */\nexport default 1\n')
		expect(check().status).toBe(0)
	})

	it('読めないファイルは理由を出して落ちる', () => {
		write('a.ts', 'const = = =\n')
		const { status, stderr } = check()
		expect(status).toBe(1)
		expect(stderr).toMatch(/読めない/)
	})
})
