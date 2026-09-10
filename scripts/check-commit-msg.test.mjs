import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const CHECK = fileURLToPath(new URL('./check-commit-msg.mjs', import.meta.url))
const FILE = path.join(mkdtempSync(path.join(tmpdir(), 'commit-msg-')), 'COMMIT_EDITMSG')

// 落ちる理由が字数や日本語の検査に移っても気づけるよう、接頭辞の指摘だけを見る
const rejectsPrefix = (subject) => {
	writeFileSync(FILE, subject)
	try {
		execFileSync('node', [CHECK, FILE], { stdio: 'pipe' })
		return false
	} catch (error) {
		return /接頭辞/.test(String(error.stderr))
	}
}

describe('分類の接頭辞', () => {
	it('型・スコープ・破壊的変更の印が付いた件名を落とす', () => {
		expect(rejectsPrefix('feat: 検索を速くする仕組みに替える')).toBe(true)
		expect(rejectsPrefix('chore(deps): 依存を最新に上げる')).toBe(true)
		expect(rejectsPrefix('refactor(app/utils): 判定を純粋関数に出す')).toBe(true)
		expect(rejectsPrefix('FEAT!: 検索を速くする仕組みに替える')).toBe(true)
		expect(rejectsPrefix('docs：規約から接頭辞の記述を落とす')).toBe(true)
	})

	it('日本語の言い切りの件名は通す', () => {
		expect(rejectsPrefix('ページングの判定を純粋関数に出してテストで守る')).toBe(false)
		expect(rejectsPrefix('起動指定からrun_in_background: trueの重複記述を消す')).toBe(false)
		expect(rejectsPrefix('run_in_background: trueの重複記述を起動指定から消す')).toBe(false)
		expect(rejectsPrefix('ADR 11: 検査の一覧を文書から落とす')).toBe(false)
	})

	it('定型の件名は見ない', () => {
		expect(rejectsPrefix('Merge branch main into feature')).toBe(false)
		expect(rejectsPrefix('Revert "fix: 外部リンクの rel を直す"')).toBe(false)
	})
})
