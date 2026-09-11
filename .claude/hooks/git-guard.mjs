#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

const SHAPE = 'claude/<主題>-<英数字4〜6>'
const BRANCH = /^claude\/[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{4,6}$/
const TRUNK = 'main'
const HOOKS_PATH = '.githooks'

const TOOLS = {
	push_files:
		'GitHub 側でコミットが作られ、commit-msg も pre-commit も通らない。git で commit して push する',
	create_or_update_file:
		'GitHub 側でコミットが作られ、commit-msg も pre-commit も通らない。git で commit して push する',
	delete_file:
		'GitHub 側でコミットが作られ、commit-msg も pre-commit も通らない。git で commit して push する',
	update_pull_request_branch: `GitHub 側でマージコミットが作られ、フックを通らない。${TRUNK} をローカルでマージして push する`,
	merge_pull_request: 'マージするかは書き手が判断する',
	enable_pr_auto_merge: 'マージするかは書き手が判断する',
}

const TOKEN =
	/\d*(?:>>|<<-?|[<>])&?\d*|&&|\|\||[;|&\n(){}]|"(?:[^"\\]|\\.)*"|'[^']*'|[^\s;|&\n(){}"']+/g
const SEPARATOR = new Set(['&&', '||', ';', '|', '&', '\n', '(', ')', '{', '}'])
const unquote = (token) => token.replace(/^"([\s\S]*)"$/, '$1').replace(/^'([\s\S]*)'$/, '$1')

const REDIRECT = /^\d*[<>]+/
const HEREDOC = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/g

const withoutHeredocs = (command) => {
	const kept = []
	const ends = []
	for (const line of command.split('\n')) {
		if (ends.length > 0) {
			if (line.trim() === ends[0]) ends.shift()
			continue
		}
		kept.push(line)
		for (const [, , tag] of line.matchAll(HEREDOC)) ends.push(tag)
	}
	return kept.join('\n')
}

const segments = (command) => {
	const tokens = [...withoutHeredocs(command).matchAll(TOKEN)].map(([token]) => token)
	const found = [[]]
	for (let at = 0; at < tokens.length; at += 1) {
		const token = tokens[at]
		if (SEPARATOR.has(token)) found.push([])
		else if (REDIRECT.test(token)) at += /^\d*[<>]+$/.test(token) ? 1 : 0
		else found.at(-1).push(unquote(token))
	}
	return found
}

const VALUED = new Set(['-c', '--config-env', '-C', '--git-dir', '--work-tree', '--namespace'])
const ATTACHED = /^(--[a-z-]+)=([\s\S]*)$/

const parse = (tokens) => {
	const values = []
	let at = 1
	while (at < tokens.length && tokens[at].startsWith('-')) {
		const attached = ATTACHED.exec(tokens[at])
		if (attached && VALUED.has(attached[1])) values.push(attached[2])
		else if (VALUED.has(tokens[at])) values.push(tokens[at + 1] ?? '')
		at += !attached && VALUED.has(tokens[at]) ? 2 : 1
	}
	return { values, subcommand: tokens[at] ?? '', args: tokens.slice(at + 1) }
}

const NO_VERIFY = /^(?:--no-verify|-[a-zA-Z]*n[a-zA-Z]*)$/
const FORCE = /^(?:-[a-zA-Z]*f[a-zA-Z]*|--force(?:-with-lease|-if-includes)?(?:=.*)?)$/
const PUSH_VALUED = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec'])
const NEW_BRANCH = {
	checkout: /^(?:-[bB]|--orphan)$/,
	switch: /^(?:-[cC]|--create|--force-create|--orphan)$/,
	worktree: /^-[bB]$/,
}
const RENAME = /^(?:-[mMcC]|--move|--copy)$/
const BRANCH_CREATE = /^(?:-f|--force|-t|--track|--no-track|-q|--quiet)$/
const REBASING = /^(?:-[a-zA-Z]*r[a-zA-Z]*|--rebase(?:=(?!false).*)?)$/
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/

const shown = (name) => (name === '' ? '（不明）' : name)

const named = (name) =>
	name === TRUNK
		? `${TRUNK} を直接動かすものは通さない。作業は ${SHAPE} のブランチに置く`
		: BRANCH.test(name)
			? null
			: `ブランチ名 ${shown(name)} が規約に合わない。${SHAPE} で切る`

const pushed = (args, git) => {
	const positional = []
	for (let at = 0; at < args.length; at += 1) {
		if (PUSH_VALUED.has(args[at])) at += 1
		else if (!args[at].startsWith('-')) positional.push(args[at])
	}

	const remote = positional[0] ?? 'origin'
	const specs = positional.length > 1 ? positional.slice(1) : ['HEAD']
	const force = args.some((arg) => FORCE.test(arg)) || specs.some((spec) => spec.startsWith('+'))

	for (const spec of specs) {
		const [source, destination] = spec.replace(/^\+/, '').split(':')
		const reference = destination ?? source
		const target =
			reference === 'HEAD' || reference === ''
				? git.head()
				: reference.replace(/^refs\/heads\//, '')

		const reason = named(target)
		if (reason) return reason
		// ハーネスはマージ済みのブランチを main から作り直す。その push だけは通す
		if (force && !git.merged(remote, target)) {
			return `force push は他の checkout を壊す。${remote}/${target} は ${TRUNK} に入りきっていない`
		}
	}
	return null
}

const created = (args, flag) => {
	const at = args.findIndex((arg) => flag.test(arg))
	return at === -1 ? null : named(args[at + 1] ?? '')
}

const branched = (args) => {
	const flags = args.filter((arg) => arg.startsWith('-'))
	const positional = args.filter((arg) => !arg.startsWith('-'))
	if (positional.length === 0) return null
	if (flags.some((flag) => RENAME.test(flag))) return named(positional.at(-1))
	return flags.every((flag) => BRANCH_CREATE.test(flag)) ? named(positional[0]) : null
}

const invoked = (tokens) => {
	let at = 0
	while (at < tokens.length && (ASSIGNMENT.test(tokens[at]) || tokens[at] === 'env')) at += 1
	const name = tokens[at]?.replace(/^.*\//, '')
	return name === 'git' ? tokens.slice(at) : null
}

const git = (segment, ask) => {
	const tokens = invoked(segment)
	if (tokens === null) return null
	const { values, subcommand, args } = parse(tokens)

	if (values.some((value) => /^core\.hooksPath=/i.test(value))) {
		return `core.hooksPath の差し替えは commit-msg と pre-commit を外す`
	}

	if (subcommand === 'config') {
		if (args.includes('--remove-section') && args.some((arg) => /^core$/i.test(arg))) {
			return `core.hooksPath を外すと commit-msg も pre-commit も走らない`
		}
		const at = args.findIndex((arg) => /^core\.hooksPath$/i.test(arg))
		if (at === -1) return null
		if (args.some((arg) => arg.startsWith('--unset'))) {
			return `core.hooksPath を外すと commit-msg も pre-commit も走らない`
		}
		const value = args[at + 1]
		return value === undefined || value === HOOKS_PATH
			? null
			: `core.hooksPath は ${HOOKS_PATH} のまま使う`
	}

	if (subcommand === 'commit') {
		if (args.some((arg) => NO_VERIFY.test(arg))) {
			return '--no-verify は pre-commit と commit-msg を飛ばす。落ちた検査のほうを直す'
		}
		if (args.includes('--amend')) return '--amend は履歴を書き換える。新しいコミットを積む'
		const path = ask.hooksPath()
		if (path !== HOOKS_PATH) {
			return `core.hooksPath が ${shown(path)} で、commit-msg も pre-commit も走らない。node .claude/hooks/session-start.mjs を先に打つ`
		}
		return null
	}

	const rebase = `rebase は履歴を書き換える。${TRUNK} をマージして解消する`
	if (subcommand === 'rebase') return rebase
	if (subcommand === 'pull' && args.some((arg) => REBASING.test(arg))) return rebase
	if (values.some((value) => /^pull\.rebase=(?!false)/i.test(value))) return rebase

	if (subcommand === 'push') return pushed(args, ask)
	if (subcommand === 'branch') return branched(args)
	if (Object.hasOwn(NEW_BRANCH, subcommand)) return created(args, NEW_BRANCH[subcommand])
	return null
}

const run = (...args) => {
	try {
		return execFileSync('git', args, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return ''
	}
}

const ancestor = (remote, branch) => {
	try {
		execFileSync(
			'git',
			[
				'merge-base',
				'--is-ancestor',
				`refs/remotes/${remote}/${branch}`,
				`refs/remotes/${remote}/${TRUNK}`,
			],
			{ stdio: 'ignore' },
		)
		return true
	} catch {
		return false
	}
}

const ASK = {
	hooksPath: () => run('config', '--get', 'core.hooksPath'),
	head: () => run('rev-parse', '--abbrev-ref', 'HEAD'),
	merged: ancestor,
}

export const decide = (input, ask = ASK) => {
	const name = input.tool_name ?? ''

	if (name.startsWith('mcp__github__')) {
		const tool = name.slice('mcp__github__'.length)
		if (Object.hasOwn(TOOLS, tool)) return TOOLS[tool]
		if (tool === 'create_branch') return named(input.tool_input?.branch ?? '')
		return null
	}

	if (name !== 'Bash') return null
	const command = input.tool_input?.command
	if (typeof command !== 'string') return null

	for (const tokens of segments(command)) {
		const reason = git(tokens, ask)
		if (reason) return reason
	}
	return null
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('git-guard.mjs')) {
	// 判定できないときは黙って通す。フックがツール呼び出しを止めない
	try {
		const input = JSON.parse((await read()) || '{}')
		const reason = decide(input)
		if (reason) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						permissionDecision: 'deny',
						permissionDecisionReason: reason,
					},
				}),
			)
		}
	} catch {}
}
