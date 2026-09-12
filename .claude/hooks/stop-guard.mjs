#!/usr/bin/env node
// 開いていない PNG と push していない変更を残したまま、セッションを終わらせない。
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
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

export const unfinished = ({ shots = [], seen = [], dirty = false, ahead = 0, blocked = [] }) => {
	// 同じ理由で二度は止めない。直せない状況では終われなくなる
	const unread = shots.filter((shot) => !seen.includes(shot))
	if (unread.length > 0 && !blocked.includes('png')) {
		return {
			kind: 'png',
			reason: `撮った PNG を開いていない: ${unread.join(' ')}。置いただけでは確認にならない`,
		}
	}
	if ((dirty || ahead > 0) && !blocked.includes('push')) {
		return {
			kind: 'push',
			reason: `${dirty ? 'コミットしていない変更' : `push していないコミットが ${ahead} 件`}がある。コンテナが消えると失われる`,
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

const shots = () => {
	try {
		return readdirSync(join(root, EVIDENCE))
			.filter((name) => name.endsWith('.png'))
			.sort()
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
				const shot = opened(input)
				if (shot) store.write({ ...kept, seen: [...new Set([...kept.seen, shot])] })
			}
		}
	} catch {}
}
