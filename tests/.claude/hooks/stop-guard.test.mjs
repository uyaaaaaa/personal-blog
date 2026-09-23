import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { devNull, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ahead, unfinished } from '~~/.claude/hooks/stop-guard.mjs'

const HOOK = fileURLToPath(new URL('../../../.claude/hooks/stop-guard.mjs', import.meta.url))

describe('unfinished', () => {
	it('コミットと push を別々に止める', () => {
		expect(unfinished({ dirty: true }).kind).toBe('commit')
		expect(unfinished({ dirty: false, ahead: 2, blocked: ['commit'] }).reason).toMatch('2 件')
		expect(unfinished({})).toBeNull()
	})

	it('コミット・push の順に、1回ずつ出す', () => {
		expect(unfinished({ dirty: true, ahead: 1 }).kind).toBe('commit')
		expect(unfinished({ dirty: true, ahead: 1, blocked: ['commit'] }).kind).toBe('push')
		expect(unfinished({ dirty: true, ahead: 1, blocked: ['commit', 'push'] })).toBeNull()
	})
})

describe('ahead', () => {
	// 手元の global 設定（署名の要求など）をテストに持ち込まない
	const env = {
		...process.env,
		GIT_CONFIG_GLOBAL: devNull,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_AUTHOR_NAME: 't',
		GIT_AUTHOR_EMAIL: 't@example.com',
		GIT_COMMITTER_NAME: 't',
		GIT_COMMITTER_EMAIL: 't@example.com',
	}
	const sh = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim()
	const commit = (cwd, name) => {
		writeFileSync(join(cwd, name), name)
		sh(cwd, 'add', name)
		sh(cwd, 'commit', '-q', '-m', name)
	}

	it('どのリモートにも無いコミットだけを数え、upstream の無いブランチや古い origin/main に釣られない', () => {
		const base = mkdtempSync(join(tmpdir(), 'stop-guard-git-'))
		const remote = join(base, 'remote.git')
		const work = join(base, 'work')
		sh(base, 'init', '-q', '--bare', remote)
		sh(base, 'init', '-q', '-b', 'main', work)
		sh(work, 'remote', 'add', 'origin', remote)
		commit(work, 'a')
		sh(work, 'push', '-q', 'origin', 'main')
		sh(work, 'checkout', '-q', '-b', 'claude/x')
		commit(work, 'b')
		commit(work, 'c')
		sh(work, 'push', '-q', 'origin', 'HEAD:refs/heads/claude/x')
		expect(ahead(work)).toBe(0)

		commit(work, 'd')
		expect(ahead(work)).toBe(1)
	})
})

describe('フックとして打つ', () => {
	const fire = (input, root, store) =>
		execFileSync('node', [HOOK], {
			input: JSON.stringify(input),
			encoding: 'utf8',
			env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_HOOK_STATE_DIR: store },
		})

	it('同じ理由では2度止めない', () => {
		const base = mkdtempSync(join(tmpdir(), 'stop-guard-'))
		const root = join(base, 'project')
		const store = join(base, 'state')
		mkdirSync(root)
		execFileSync('git', ['init', '-q', root])
		writeFileSync(join(root, 'x'), 'x')

		const stop = { session_id: 'one', hook_event_name: 'Stop' }
		expect(fire(stop, root, store)).toMatch('コミットしていない')
		expect(fire(stop, root, store)).toBe('')
	})
})
