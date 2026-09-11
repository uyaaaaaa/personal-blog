#!/usr/bin/env node
const LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])
const DEFAULT = 'medium'

const hasLevel = (args) =>
	args
		.split(/\s+/)
		.filter(Boolean)
		.some((token) => LEVELS.has(token.toLowerCase()) || /^--?effort[=:]/i.test(token))

export const decide = (input) => {
	if (input.tool_name !== 'Skill') return null

	const { skill, args } = input.tool_input ?? {}
	if (skill !== 'code-review') return null

	const given = typeof args === 'string' ? args : ''
	if (hasLevel(given)) return null

	return { ...input.tool_input, args: given ? `${given} ${DEFAULT}` : DEFAULT }
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('code-review-effort.mjs')) {
	// 補えないときは黙って通す。フックがツール呼び出しを止めない
	try {
		const updatedInput = decide(JSON.parse((await read()) || '{}'))
		if (updatedInput) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						updatedInput,
					},
					systemMessage: `code-review の effort を ${DEFAULT} に補った`,
				}),
			)
		}
	} catch {
		// 握りつぶす
	}
}
