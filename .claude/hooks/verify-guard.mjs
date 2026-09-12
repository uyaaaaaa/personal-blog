#!/usr/bin/env node
// 証跡の残らない実測と、dev と同時に回した実測を落とす。
import { readFileSync } from 'node:fs'
import { REDIRECT, SEPARATOR, invoked, tokens, unquote } from './command.mjs'

const EVIDENCE = '.verify'
const DEV_PORT = 3000

const MEASURED = new Set(['lint', 'test', 'build', 'generate'])

// パイプは分けない。tee で証跡に落とす打ち方が1つの実測
const lines = (command) => {
	const found = [{ evidence: false, commands: [[]] }]
	for (const token of tokens(command)) {
		if (token === '|') found.at(-1).commands.push([])
		else if (SEPARATOR.has(token)) found.push({ evidence: false, commands: [[]] })
		else if (!REDIRECT.test(token)) {
			const value = unquote(token)
			if (value.includes(`${EVIDENCE}/`)) found.at(-1).evidence = true
			found.at(-1).commands.at(-1).push(value)
		}
	}
	return found
}

const measured = (command) => {
	const npm = invoked(command, 'npm')
	if (npm === null) return null
	const args = npm.slice(1).filter((token) => !token.startsWith('-'))
	const script = args[0] === 'run' ? args[1] : args[0]
	return MEASURED.has(script) ? script : null
}

const removes = (command) =>
	invoked(command, 'rm') !== null && command.some((token) => token.includes(EVIDENCE))

// /proc/net/tcp は 16 進のポートと 0A（LISTEN）で並ぶ。Linux 以外には無い
const LISTEN = '0A'
const PORT = DEV_PORT.toString(16).toUpperCase().padStart(4, '0')

const listening = () =>
	['/proc/net/tcp', '/proc/net/tcp6'].some((path) => {
		try {
			return readFileSync(path, 'utf8')
				.split('\n')
				.slice(1)
				.some((line) => {
					const [, local, , status] = line.trim().split(/\s+/)
					return local?.endsWith(`:${PORT}`) && status === LISTEN
				})
		} catch {
			return false
		}
	})

const ASK = { devUp: listening }

export const decide = (input, ask = ASK) => {
	if (input.tool_name !== 'Bash') return null
	const command = input.tool_input?.command
	if (typeof command !== 'string') return null

	for (const { evidence, commands } of lines(command)) {
		for (const each of commands) {
			if (input.agent_id && removes(each)) {
				return `${EVIDENCE}/ を作り直すのは投げた側。並行して測っている証跡まで消える`
			}

			const script = measured(each)
			if (script === null) continue

			if (ask.devUp()) {
				return `dev が ${DEV_PORT} で動いている。.nuxt を共有するので ${script} は別のものを測る。dev を止めてから打つ`
			}
			if (!evidence) {
				return `証跡が残らない。npm run ${script} > ${EVIDENCE}/${script}.log 2>&1; echo $? の形で打つ`
			}
		}
	}
	return null
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('verify-guard.mjs')) {
	// 判定できないときは黙って通す。フックがツール呼び出しを止めない
	try {
		const reason = decide(JSON.parse((await read()) || '{}'))
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
