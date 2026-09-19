#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { complete, findings, rules } from '../../scripts/issue-shape.mjs'
import { read } from '../../scripts/stdin.mjs'

const SKILL = '.claude/skills/create-issues/SKILL.md'
const TOOL = 'mcp__github__issue_write'
// 更新は見ない。PR の題・本文・ラベルも同じ口を通り、issue と見分けられない
const CREATE = 'create'

export const decide = (input, ask = ASK) => {
	if (input.tool_name !== TOOL) return null

	const { method, title, body, labels } = input.tool_input ?? {}
	if (method !== CREATE) return null

	const it = rules(ask.skill())
	if (!complete(it)) return null

	const found = findings({ title, body, labels }, it)
	if (found.length === 0) return null
	return `issue が型に合わない（→ ${SKILL}）:\n${found.map((reason) => `- ${reason}`).join('\n')}`
}

const root = () => process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

const ASK = { skill: () => readFileSync(join(root(), SKILL), 'utf8') }

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('issue-guard.mjs')) {
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
