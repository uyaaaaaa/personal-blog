#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { read } from '../../scripts/stdin.mjs'

const TRUNK = 'main'
const TEMPLATE = '.github/pull_request_template.md'
const LABEL = 'agent'

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

// 跨ぐのは実際に付く飾りだけ。* は Markdown の箇条書きの印でもあり、本文の行に当たる
const SIGNATURE =
	/^[\s_🤖]*Generated (?:with|by) \[Claude Code\]|^\s*https:\/\/claude\.ai\/code\/session_|^\s*Co-Authored-By:.*Claude|^\s*Claude-Session:/u
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

const DECISION = '判断してほしいこと'

const COMMENT = /^\s*<!--[\s\S]*-->\s*$/

const text = (node) => node.value ?? (node.children ?? []).map(text).join('')

const shown = (node) =>
	node.type !== 'thematicBreak' &&
	!(node.type === 'html' && COMMENT.test(node.value)) &&
	(node.type === 'image' || node.type === 'code' || text(node).trim() !== '')

const filled = (body, heading) => {
	const sections = []
	for (const node of unified().use(remarkParse).parse(body).children) {
		if (node.type === 'heading' && node.depth <= 2) {
			sections.push({ open: node.depth === 2 && text(node).trim() === heading, nodes: [] })
		} else {
			sections.at(-1)?.nodes.push(node)
		}
	}
	return sections.some(({ open, nodes }) => open && nodes.some(shown))
}

export const pending = (body) => filled(body, DECISION)

// 更新で draft を省くと今の状態が保たれ、draft かどうかが見えないので、判断が残る本文には draft の明示を求める
const undrafted = (args) => {
	if (args.draft === true || typeof args.body !== 'string' || !pending(args.body)) return null
	return `「${DECISION}」が残っている。draft で出す`
}

// 更新は渡された値だけを見る。渡されていない値は今のままで、ここからは見えない
const shaped = (args) => {
	if (args.base !== undefined && args.base !== TRUNK) return `base は ${TRUNK} にする`
	if (typeof args.body !== 'string') return null
	if (!filled(args.body, 'やったこと')) return `本文を ${TEMPLATE} の型で書く`
	return undrafted(args)
}

const blocking = (args, ask) => {
	const branch = ask.head()
	if (branch === '') return 'HEAD のブランチ名を読めない'
	if (branch === TRUNK || branch === 'HEAD') {
		return `${TRUNK} から PR は出せない。claude/<主題>-<英数字4〜6> のブランチに移す`
	}
	if (typeof args.head === 'string' && args.head !== branch) {
		return `head が ${args.head} で、出す前の条件を測る作業ツリー（${branch}）と違う`
	}
	if (typeof args.body !== 'string') return `本文を ${TEMPLATE} の型で書く`
	const shape = shaped(args)
	if (shape) return shape

	const dirty = ask.dirty()
	if (dirty === null) return 'git status を読めない'
	if (dirty !== '') return `コミットしていない変更が残っている:\n${dirty}`

	const unpushed = ask.unpushed(branch)
	if (unpushed !== '') return `push していない: ${unpushed}`

	for (const [name, argv] of CHECKS) {
		const { code, log } = ask.check(name, argv)
		if (code !== 0) {
			return `npm ${argv.join(' ')} が終了コード ${code}:\n${tail(log)}`
		}
	}
	return null
}

export const decide = (input, ask = ASK) => {
	const name = input.tool_name ?? ''
	if (!name.startsWith('mcp__github__')) return null

	const tool = name.slice('mcp__github__'.length)
	if (tool !== 'create_pull_request' && tool !== 'update_pull_request') return null

	const given = input.tool_input ?? {}
	const body = typeof given.body === 'string' ? unsigned(given.body) : null
	const args = body === null ? given : { ...given, body }
	const creating = tool === 'create_pull_request'
	const reason = creating ? blocking(args, ask) : shaped(args)
	if (reason) return { deny: reason }

	const found = {
		...(body === null ? {} : { updatedInput: args }),
		...(creating ? { context: `作成したら ${LABEL} ラベルを付ける` } : {}),
	}
	return Object.keys(found).length === 0 ? null : found
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

// 失敗した git の出力を値として返さない。空の結果と区別が付かなくなる
const git = (...argv) => {
	const { code, log } = run('git', argv)
	return code === 0 ? log.trim() : null
}

const ASK = {
	head: () => git('rev-parse', '--abbrev-ref', 'HEAD') ?? '',
	dirty: () => {
		const { code, log } = run('git', ['status', '--short'])
		return code === 0 ? log.trimEnd() : null
	},
	unpushed: (branch) => {
		const at = `refs/remotes/origin/${branch}`
		if (git('rev-parse', '--verify', '--quiet', at) === null) return `origin/${branch} が無い`
		const ahead = git('rev-list', '--count', `${at}..HEAD`)
		if (ahead === null) return `origin/${branch} との差を数えられない`
		return ahead === '0' ? '' : `origin/${branch} より ${ahead} コミット先`
	},
	check: (_name, argv) => run('npm', argv),
}

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
		} else if (found) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						...(found.updatedInput ? { updatedInput: found.updatedInput } : {}),
						...(found.context ? { additionalContext: found.context } : {}),
					},
					...(found.updatedInput ? { systemMessage: '本文の署名を落とした' } : {}),
				}),
			)
		}
	} catch {}
}
