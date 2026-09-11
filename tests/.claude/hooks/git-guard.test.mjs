import { describe, expect, it } from 'vitest'
import { decide } from '~~/.claude/hooks/git-guard.mjs'

const ask = {
	hooksPath: () => '.githooks',
	head: () => 'claude/issue-291-8ci6iu',
	merged: () => false,
}
const bare = { ...ask, hooksPath: () => '' }
const onMain = { ...ask, head: () => 'main' }
const merged = { ...ask, merged: () => true }

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } })
const mcp = (tool, tool_input = {}) => ({ tool_name: `mcp__github__${tool}`, tool_input })

describe('decide', () => {
	it('フックを外す commit を止め、素の commit は通す', () => {
		expect(decide(bash('git commit --no-verify -m "x"'), ask)).toMatch('--no-verify')
		expect(decide(bash('git commit -n -m "x"'), ask)).toMatch('--no-verify')
		expect(decide(bash('git commit --amend -m "x"'), ask)).toMatch('--amend')
		expect(decide(bash('git -c core.hooksPath=/dev/null commit -m "x"'), ask)).toMatch(
			'core.hooksPath',
		)
		expect(decide(bash('git commit -m "件名を日本語で書く"'), ask)).toBeNull()
	})

	it('hooksPath の差し替えと取り外しだけを止め、読みと設定し直しは通す', () => {
		expect(decide(bash('git config core.hooksPath /dev/null'), ask)).toMatch('core.hooksPath')
		expect(decide(bash('git config --unset core.hooksPath'), ask)).toMatch('core.hooksPath')
		expect(decide(bash('git config --get core.hooksPath'), ask)).toBeNull()
		expect(decide(bash('git config core.hooksPath .githooks'), ask)).toBeNull()
	})

	it('フックが有効になっていないセッションの commit を止める', () => {
		expect(decide(bash('git commit -m "x"'), bare)).toMatch('session-start')
	})

	it('履歴を書き換える経路を止める', () => {
		expect(decide(bash('git rebase origin/main'), ask)).toMatch('rebase')
		expect(decide(bash('git push --force origin claude/issue-291-8ci6iu'), ask)).toMatch(
			'force push',
		)
		expect(decide(bash('git push -f origin claude/issue-291-8ci6iu'), ask)).toMatch(
			'force push',
		)
		expect(decide(bash('git push origin +claude/issue-291-8ci6iu'), ask)).toMatch('force push')
	})

	it('マージ済みのブランチを作り直す force push は通す', () => {
		expect(
			decide(bash('git push --force-with-lease -u origin claude/issue-291-8ci6iu'), merged),
		).toBeNull()
		expect(decide(bash('git checkout -B claude/issue-291-8ci6iu origin/main'), ask)).toBeNull()
	})

	it('main への push を止める', () => {
		expect(decide(bash('git push origin main'), ask)).toMatch('main')
		expect(decide(bash('git push origin HEAD:refs/heads/main'), ask)).toMatch('main')
		expect(decide(bash('git push'), onMain)).toMatch('main')
		expect(decide(bash('git push -u origin claude/issue-291-8ci6iu'), ask)).toBeNull()
		expect(decide(bash('git push'), ask)).toBeNull()
	})

	it('規約に合わないブランチ名の作成と push を止める', () => {
		expect(decide(bash('git checkout -b fix-291'), ask)).toMatch('ブランチ名')
		expect(decide(bash('git switch -c claude/issue-291'), ask)).toMatch('ブランチ名')
		expect(decide(bash('git branch -m claude/nope'), ask)).toMatch('ブランチ名')
		expect(decide(bash('git push origin claude/nope'), ask)).toMatch('ブランチ名')
		expect(decide(bash('git checkout -b claude/issue-291-8ci6iu'), ask)).toBeNull()
		expect(decide(bash('git switch -c claude/git-guard-a1b2c3'), ask)).toBeNull()
	})

	it('ブランチを作らない git は通す', () => {
		expect(decide(bash('git checkout main'), ask)).toBeNull()
		expect(decide(bash('git checkout -- app/pages/index.vue'), ask)).toBeNull()
		expect(decide(bash('git branch -d claude/old-a1b2c3'), ask)).toBeNull()
		expect(decide(bash('git status --short'), ask)).toBeNull()
		expect(decide(bash('git log --oneline -1'), ask)).toBeNull()
	})

	it('繋いだコマンドの後ろの git も見る', () => {
		expect(decide(bash('npm run lint && git commit --no-verify -m "x"'), ask)).toMatch(
			'--no-verify',
		)
		expect(
			decide(bash('git push origin claude/issue-291-8ci6iu 2>&1 | tail -2'), ask),
		).toBeNull()
		expect(
			decide(bash('git push origin claude/issue-291-8ci6iu > .verify/push.log'), ask),
		).toBeNull()
	})

	it('件名に書かれたオプションはオプションとして読まない', () => {
		expect(decide(bash('git commit -m "--no-verify を止める検査を足す"'), ask)).toBeNull()
	})

	it('GitHub 側でコミットとマージを作るツールを止める', () => {
		expect(decide(mcp('push_files'), ask)).toMatch('commit-msg')
		expect(decide(mcp('create_or_update_file'), ask)).toMatch('commit-msg')
		expect(decide(mcp('delete_file'), ask)).toMatch('commit-msg')
		expect(decide(mcp('merge_pull_request'), ask)).toMatch('書き手')
		expect(decide(mcp('enable_pr_auto_merge'), ask)).toMatch('書き手')
		expect(decide(mcp('create_branch', { branch: 'fix-291' }), ask)).toMatch('ブランチ名')
		expect(decide(mcp('create_branch', { branch: 'claude/issue-291-8ci6iu' }), ask)).toBeNull()
		expect(decide(mcp('create_pull_request'), ask)).toBeNull()
	})

	it('git 以外のツールと読み取れない入力は通す', () => {
		expect(decide({ tool_name: 'Edit', tool_input: { file_path: 'a.ts' } }, ask)).toBeNull()
		expect(decide(bash('npm run build'), ask)).toBeNull()
		expect(decide({ tool_name: 'Bash', tool_input: {} }, ask)).toBeNull()
	})
})
