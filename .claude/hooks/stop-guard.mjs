#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { state } from './state.mjs'

const EVIDENCE = '.verify'
const TRUNK = 'origin/main'
const SHOT = /(?:^|\/)\.verify\/([^/]+\.png)$/

export const opened = ({ tool_name: tool, tool_input: input } = {}) => {
	if (tool !== 'Read') return null
	const path = input?.file_path
	return (typeof path === 'string' && SHOT.exec(path)?.[1]) || null
}

export const stamp = ({ name, mtime }) => `${name}@${mtime}`

export const unfinished = ({ shots = [], seen = [], dirty = false, ahead = 0, blocked = [] }) => {
	const empty = shots.filter(({ bytes }) => bytes === 0)
	if (empty.length > 0 && !blocked.includes('empty')) {
		return {
			kind: 'empty',
			reason: `撮れていない PNG がある: ${empty.map(({ name }) => name).join(' ')}。撮り直す`,
		}
	}

	const unread = shots.filter((shot) => shot.bytes !== 0 && !seen.includes(stamp(shot)))
	if (unread.length > 0 && !blocked.includes('png')) {
		return {
			kind: 'png',
			reason: `撮った PNG を開いていない: ${unread.map(({ name }) => name).join(' ')}。置いただけでは確認にならない`,
		}
	}
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

const git = (...args) => {
	try {
		return execFileSync('git', args, {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return ''
	}
}

const shotOf = (name) => {
	try {
		const { mtimeMs, size } = statSync(join(root, EVIDENCE, name))
		return { name, mtime: mtimeMs, bytes: size }
	} catch {
		return null
	}
}

const shots = () => {
	try {
		return readdirSync(join(root, EVIDENCE))
			.filter((name) => name.endsWith('.png'))
			.sort()
			.map(shotOf)
			.filter((shot) => shot !== null)
	} catch {
		return []
	}
}

const ahead = () => {
	const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
	return Number(git('rev-list', '--count', `${upstream || TRUNK}..HEAD`)) || 0
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

if (process.argv[1]?.endsWith('stop-guard.mjs')) {
	try {
		const input = JSON.parse((await read()) || '{}')
		const delegated = Boolean(input.agent_id)
		if (!delegated) {
			const store = state('stop-guard', input)
			const kept = { seen: [], blocked: [], ...store.read() }

			if (input.hook_event_name === 'Stop') {
				const left = unfinished({
					...kept,
					shots: shots(),
					dirty: git('status', '--porcelain') !== '',
					ahead: ahead(),
				})
				if (left) {
					store.write({ ...kept, blocked: [...kept.blocked, left.kind] })
					process.stdout.write(JSON.stringify({ decision: 'block', reason: left.reason }))
				}
			} else {
				const name = opened(input)
				const shot = name === null ? null : shotOf(name)
				if (shot) store.write({ ...kept, seen: [...new Set([...kept.seen, stamp(shot)])] })
			}
		}
	} catch {}
}
