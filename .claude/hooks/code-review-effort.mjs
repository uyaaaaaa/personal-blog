#!/usr/bin/env node
// Skill(code-review) の呼び出しに effort が無ければ medium を足す。
// 明示された effort（high など）はそのまま通す。
const LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])
const DEFAULT = 'medium'

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

const pass = () => process.exit(0)

const input = JSON.parse((await read()) || '{}')
if (input.tool_name !== 'Skill') pass()

const args = input.tool_input?.args ?? ''
if (input.tool_input?.skill !== 'code-review') pass()
if (args.split(/\s+/).some((token) => LEVELS.has(token.toLowerCase()))) pass()

process.stdout.write(
	JSON.stringify({
		hookSpecificOutput: {
			hookEventName: 'PreToolUse',
			updatedInput: { ...input.tool_input, args: args ? `${args} ${DEFAULT}` : DEFAULT },
		},
		systemMessage: `code-review の effort を ${DEFAULT} に補った`,
	}),
)
