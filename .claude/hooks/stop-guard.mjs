#!/usr/bin/env node
// 開いていない PNG と push していない変更を残したまま、セッションを終わらせない。
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

// 撮り直すと名前は同じまま中身が変わる。開いたかは更新時刻まで見て数える
export const stamp = ({ name, at }) => `${name}@${at}`

export const unfinished = ({ shots = [], seen = [], dirty = false, ahead = 0, blocked = [] }) => {
	// 同じ理由で二度は止めない。直せない状況では終われなくなる
	// 0 バイトの PNG は Read が落ちるので、開けとは言わない
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

const found = (name) => {
	try {
		const { mtimeMs, size } = statSync(join(root, EVIDENCE, name))
		return { name, at: mtimeMs, bytes: size }
	} catch {
		return null
	}
}

const shots = () => {
	try {
		return readdirSync(join(root, EVIDENCE))
			.filter((name) => name.endsWith('.png'))
			.sort()
			.map(found)
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

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('stop-guard.mjs')) {
	// 判定できないときは黙って通す。フックがセッションを止めない
	try {
		const input = JSON.parse((await read()) || '{}')
		// 委譲先の Read は数えない。撮影を投げても、開くのは本体
		if (!input.agent_id) {
			const store = state('stop-guard', input)
			const kept = { seen: [], blocked: [], ...store.read() }

			if (input.hook_event_name === 'Stop') {
				const found = unfinished({
					...kept,
					shots: shots(),
					dirty: git('status', '--porcelain') !== '',
					ahead: ahead(),
				})
				if (found) {
					store.write({ ...kept, blocked: [...kept.blocked, found.kind] })
					process.stdout.write(
						JSON.stringify({ decision: 'block', reason: found.reason }),
					)
				}
			} else {
				const name = opened(input)
				const at = name === null ? null : when(name)
				if (at !== null) {
					store.write({
						...kept,
						seen: [...new Set([...kept.seen, stamp({ name, at })])],
					})
				}
			}
		}
	} catch {}
}
