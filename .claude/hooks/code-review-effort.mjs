#!/usr/bin/env node
const LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])
const DEFAULT = 'medium'

const hasLevel = (args) =>
	args
		.split(/\s+/)
		.filter(Boolean)
		.some((token) => LEVELS.has(token.toLowerCase()) || /^--?effort[=:]/i.test(token))

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// 補えないときは黙って通す。フックがツール呼び出しを止めない。
try {
	const input = JSON.parse((await read()) || '{}')
	const { skill, args } = input.tool_input ?? {}

	if (input.tool_name === 'Skill' && skill === 'code-review') {
		const given = typeof args === 'string' ? args : ''
		if (!hasLevel(given)) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						updatedInput: {
							...input.tool_input,
							args: given ? `${given} ${DEFAULT}` : DEFAULT,
						},
					},
					systemMessage: `code-review の effort を ${DEFAULT} に補った`,
				}),
			)
		}
	}
} catch {}
