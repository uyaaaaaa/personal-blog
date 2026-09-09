#!/usr/bin/env node
// 大きいファイルの丸読みを止め、下位モデルのサブエージェント（read）に読ませる。
// 小さいファイルと範囲を絞った読みは通す。委譲の往復のほうが高くつく。
import { statSync } from 'node:fs'

const MIN_BYTES = Number(process.env.CLAUDE_DELEGATE_READ_MIN_BYTES) || 16000

// 開いても本文が context に入らない、または引用で受け取れないもの
const OPAQUE = /\.(png|jpe?g|gif|webp|bmp|ico|svg|pdf|woff2?|ttf|otf|mp4|zip|gz)$/i

// 素の cat だけを見る。パイプ・リダイレクト・head / sed -n は既に絞られている
const BARE_CAT = /^\s*cat\s+(?:--\s+)?("[^"]+"|'[^']+'|[^-\s'"|;&<>()$`][^\s'"|;&<>()$`]*)\s*$/

const unquote = (token) => token.replace(/^["']|["']$/g, '')

const readTarget = ({ file_path: path, offset, limit } = {}) => {
	if (typeof path !== 'string') return null
	if (offset !== undefined || limit !== undefined) return null
	return OPAQUE.test(path) ? null : path
}

const bashTarget = ({ command } = {}) => {
	if (typeof command !== 'string') return null
	const found = BARE_CAT.exec(command)
	if (!found) return null
	const path = unquote(found[1])
	return OPAQUE.test(path) ? null : path
}

const bytesOf = (path) => {
	try {
		const stat = statSync(path)
		return stat.isFile() ? stat.size : null
	} catch {
		return null
	}
}

export const decide = (input, sizeOf = bytesOf) => {
	const target =
		input.tool_name === 'Read'
			? readTarget(input.tool_input)
			: input.tool_name === 'Bash'
				? bashTarget(input.tool_input)
				: null
	if (target === null) return null

	const bytes = sizeOf(target)
	if (bytes === null || bytes < MIN_BYTES) return null

	return `${bytes} バイト。Agent(subagent_type: "read") に聞く。原文が要るなら Read に offset / limit を付ける。`
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('delegate-read.mjs')) {
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
	} catch {
		// 握りつぶす
	}
}
