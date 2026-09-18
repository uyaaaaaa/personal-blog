import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const CHECK = fileURLToPath(new URL('../../scripts/check-commit-msg.mjs', import.meta.url))
const FILE = path.join(mkdtempSync(path.join(tmpdir(), 'commit-msg-')), 'COMMIT_EDITMSG')

const errorsOf = (subject) => {
	writeFileSync(FILE, subject)
	try {
		execFileSync('node', [CHECK, FILE], { stdio: 'pipe' })
		return ''
	} catch (error) {
		return String(error.stderr)
	}
}

// 落ちる理由が字数や日本語の検査に移っても気づけるよう、見る指摘を文言で絞る
const rejectsPrefix = (subject) => /接頭辞/.test(errorsOf(subject))
const rejectsEnding = (subject) => /体言止め/.test(errorsOf(subject))
const rejectsScript = (subject) => /日本語がない/.test(errorsOf(subject))
const rejectsGap = (message) => /空行/.test(errorsOf(message))
const rejectsLength = (subject) => /件名が\d+字/.test(errorsOf(subject))
const rejectsPeriod = (subject) => /句点/.test(errorsOf(subject))

// 条件を1つだけ崩した件名を作る土台。他の条件は満たしている
const VALID = '外部リンクのrelを足して参照元の漏れを防ぐ'

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

describe('体言止めの語尾', () => {
	it('名詞で終わる件名を落とす', () => {
		expect(rejectsEnding('ヘッダーのナビゲーションの色を調整対応')).toBe(true)
		expect(rejectsEnding('View Allの判定を実際に見えている件数に修正')).toBe(true)
		expect(rejectsEnding('検索の入口を1つに寄せるリファクタリング')).toBe(true)
		expect(rejectsEnding('記事一覧のページングの見直し')).toBe(true)
		expect(rejectsEnding('目次の追従が外れる不具合')).toBe(true)
	})

	it('言い切りで終わる件名は通す', () => {
		expect(rejectsEnding('テーマごとの色の分岐をlintで落として原則から消す')).toBe(false)
		expect(rejectsEnding('見出しの余白をデザインの原則に合わせる')).toBe(false)
		expect(rejectsEnding('外部リンクのrelを足して参照元の漏れを防ぐ')).toBe(false)
		expect(rejectsEnding('記事の更新日をビルド時のコミットから補う')).toBe(false)
		expect(rejectsEnding('スクロールのたびに目次の位置を測り直さない')).toBe(false)
		expect(rejectsEnding('生成物の検査をlintから外して1本のコマンドに保つ')).toBe(false)
	})

	it('句点だけの違反を体言止めとして落とさない', () => {
		expect(rejectsEnding('ページングの判定を純粋関数に出す。')).toBe(false)
	})

	it('定型の件名は見ない', () => {
		expect(rejectsEnding('Revert "ヘッダーのナビゲーションの色を調整対応"')).toBe(false)
	})
})

describe('件名の日本語', () => {
	it('日本語のない件名を落とす', () => {
		expect(rejectsScript('add rel attribute to external links')).toBe(true)
		expect(rejectsScript('View All pagination fix')).toBe(true)
	})

	it('日本語の混じった件名は通す', () => {
		expect(rejectsScript(VALID)).toBe(false)
	})
})

describe('件名と本文の間の空行', () => {
	it('件名の次の行から本文が続くメッセージを落とす', () => {
		expect(rejectsGap(`${VALID}\n参照元が漏れるため`)).toBe(true)
	})

	it('空行を挟んだ本文は通す', () => {
		expect(rejectsGap(`${VALID}\n\n参照元が漏れるため`)).toBe(false)
		expect(rejectsGap(VALID)).toBe(false)
	})
})

describe('件名の字数', () => {
	it('短すぎる件名を落とす', () => {
		expect(rejectsLength('目次を直す')).toBe(true)
	})

	it('長すぎる件名を落とす', () => {
		expect(
			rejectsLength(
				'記事一覧のページングの判定をutilsの純粋関数に出して、幅ごとに実際に見えている件数と突き合わせるテストで守る',
			),
		).toBe(true)
	})

	it('収まった件名は通す', () => {
		expect(rejectsLength(VALID)).toBe(false)
	})
})

describe('末尾の句点', () => {
	it('句点で終わる件名を落とす', () => {
		expect(rejectsPeriod(`${VALID}。`)).toBe(true)
	})

	it('句点の無い件名は通す', () => {
		expect(rejectsPeriod(VALID)).toBe(false)
	})
})
