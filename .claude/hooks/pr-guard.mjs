#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TRUNK = 'main'
const EVIDENCE = '.verify'
const PROBE = 'scripts/overlay-probe.mjs'
const OVERLAY_LOG = /^overlay-.+\.log$/

// CI が打つもの。ここを足すときは .github/workflows/ と揃える
const CHECKS = [
	['lint', ['run', 'lint']],
	['test', ['test']],
	['typecheck', ['run', 'typecheck']],
]

const TAIL = 12

const root = () => process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

const tail = (log) =>
	log
		.split('\n')
		.filter((line) => line.trim() !== '')
		.slice(-TAIL)
		.join('\n')

const SIGNATURE =
	/Generated (?:with|by) \[Claude Code\]|^\s*https:\/\/claude\.ai\/code\/session_|^\s*Co-Authored-By:.*Claude|^\s*Claude-Session:/
const FILLER = /^\s*(?:[-*_]{3,})?\s*$/

export const unsigned = (body) => {
	const lines = body.split('\n')
	let top = lines.length
	for (let at = lines.length - 1; at >= 0; at -= 1) {
		if (SIGNATURE.test(lines[at])) top = at
		else if (!FILLER.test(lines[at])) break
	}
	if (top === lines.length) return null
	while (top > 0 && FILLER.test(lines[top - 1])) top -= 1
	return lines.slice(0, top).join('\n').trimEnd()
}

const CLASS = /'\.([a-z][\w-]*)'/g
const UI = 'app/'

// 被せた UI の綴りは probe が正。ここに一覧を持つと probe と別々に古くなる
const overlaid = (ask, base) => {
	const probe = ask.text(PROBE)
	if (probe === null) return false
	const names = [...new Set([...probe.matchAll(CLASS)].map(([, name]) => name))]
	if (names.length === 0) return false

	const found = new RegExp(`(?<![\\w-])(?:${names.join('|')})(?![\\w-])`)
	return ask
		.touched(base)
		.filter((path) => path.startsWith(UI))
		.some((path) => found.test(ask.text(path) ?? ''))
}

const blocking = (args, ask) => {
	const branch = ask.head()
	if (branch === TRUNK || branch === 'HEAD' || branch === '') {
		return `${TRUNK} から PR は出せない。claude/<主題>-<英数字4〜6> のブランチに移す`
	}
	if (typeof args.head === 'string' && args.head !== branch) {
		return `head が ${args.head} で、出す前の条件を測る作業ツリー（${branch}）と違う`
	}

	const dirty = ask.dirty()
	if (dirty !== '') return `コミットしていない変更が残っている:\n${dirty}`

	const unpushed = ask.unpushed(branch)
	if (unpushed !== '') return `push していない: ${unpushed}`

	const evidence = ask.evidence()
	if (evidence.length === 0) {
		return `実測の証跡が ${EVIDENCE}/ に無い。verify スキルに従って測る`
	}
	if (overlaid(ask, args.base ?? TRUNK) && !evidence.some((name) => OVERLAY_LOG.test(name))) {
		return `被せた UI を触っているのに ${EVIDENCE}/overlay-*.log が無い。node ${PROBE} <対象> を打つ`
	}

	for (const [name, argv] of CHECKS) {
		const { code, log } = ask.check(name, argv)
		if (code !== 0) {
			return `npm ${argv.join(' ')} が終了コード ${code}（${EVIDENCE}/${name}.log）:\n${tail(log)}`
		}
	}
	return null
}

export const decide = (input, ask = ASK) => {
	const name = input.tool_name ?? ''
	if (!name.startsWith('mcp__github__')) return null

	const tool = name.slice('mcp__github__'.length)
	if (tool !== 'create_pull_request' && tool !== 'update_pull_request') return null

	const args = input.tool_input ?? {}
	if (tool === 'create_pull_request') {
		const reason = blocking(args, ask)
		if (reason) return { deny: reason }
	}

	if (typeof args.body !== 'string') return null
	const body = unsigned(args.body)
	return body === null ? null : { updatedInput: { ...args, body } }
}

const run = (command, argv) => {
	try {
		return {
			code: 0,
			log: execFileSync(command, argv, {
				cwd: root(),
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			}),
		}
	} catch (error) {
		return {
			code: error.status ?? 1,
			log: `${error.stdout ?? ''}${error.stderr ?? ''}${error.stdout || error.stderr ? '' : error.message}`,
		}
	}
}

const git = (...argv) => run('git', argv).log.trim()

const ASK = {
	head: () => git('rev-parse', '--abbrev-ref', 'HEAD'),
	dirty: () => run('git', ['status', '--short']).log.trimEnd(),
	unpushed: (branch) => {
		const remote = git('rev-parse', `refs/remotes/origin/${branch}`)
		if (remote === '') return `origin/${branch} が無い`
		const ahead = git('rev-list', '--count', `refs/remotes/origin/${branch}..HEAD`)
		return ahead === '0' ? '' : `origin/${branch} より ${ahead} コミット先`
	},
	touched: (base) => {
		// 手元の origin/<base> はセッションが始まった時点のもので、古いと差分が膨らむ
		const at =
			run('git', ['fetch', '--quiet', 'origin', base]).code === 0
				? 'FETCH_HEAD'
				: `refs/remotes/origin/${base}`
		return git('diff', '--name-only', `${at}...HEAD`).split('\n').filter(Boolean)
	},
	text: (path) => {
		try {
			return readFileSync(join(root(), path), 'utf8')
		} catch {
			return null
		}
	},
	evidence: () => {
		try {
			return readdirSync(join(root(), EVIDENCE))
		} catch {
			return []
		}
	},
	check: (name, argv) => {
		const { code, log } = run('npm', argv)
		mkdirSync(join(root(), EVIDENCE), { recursive: true })
		writeFileSync(join(root(), EVIDENCE, `${name}.log`), log)
		return { code, log }
	},
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('pr-guard.mjs')) {
	try {
		const found = decide(JSON.parse((await read()) || '{}'))
		if (found?.deny) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						permissionDecision: 'deny',
						permissionDecisionReason: found.deny,
					},
				}),
			)
		} else if (found?.updatedInput) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						updatedInput: found.updatedInput,
					},
					systemMessage: '本文の署名を落とした',
				}),
			)
		}
	} catch {}
}
