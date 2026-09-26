#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { read } from '../../scripts/stdin.mjs'
import { state } from './state.mjs'

export const unfinished = ({ dirty = false, ahead = 0, blocked = [] }) => {
	if (dirty && !blocked.includes('commit')) {
		return {
			kind: 'commit',
			reason: 'コミットしていない変更がある。コンテナが消えると失われる',
		}
	}
	if (ahead > 0 && !blocked.includes('push')) {
		return {
			kind: 'push',
			reason: `push していないコミットが ${ahead} 件ある。コンテナが消えると失われる`,
		}
	}
	return null
}

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

const git = (cwd, ...args) => {
	try {
		return execFileSync('git', args, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return ''
	}
}

export const ahead = (cwd = root) =>
	Number(git(cwd, 'rev-list', '--count', 'HEAD', '--not', '--remotes')) || 0

if (process.argv[1]?.endsWith('stop-guard.mjs')) {
	try {
		const input = JSON.parse((await read()) || '{}')
		if (!input.agent_id && input.hook_event_name === 'Stop') {
			const store = state('stop-guard', input)
			const kept = { blocked: [], ...store.read() }
			const left = unfinished({
				...kept,
				dirty: git(root, 'status', '--porcelain') !== '',
				ahead: ahead(),
			})
			if (left) {
				store.write({ ...kept, blocked: [...kept.blocked, left.kind] })
				process.stdout.write(JSON.stringify({ decision: 'block', reason: left.reason }))
			}
		}
	} catch {}
}
