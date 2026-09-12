#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { state } from './state.mjs'

const SKILL = '.claude/skills/review/SKILL.md'
const EVIDENCE = '.verify'
const COMMENT_TOOL = 'mcp__github__add_comment_to_pending_review'
const REVIEW_TOOL = 'mcp__github__pull_request_review_write'

const GRADE = /^\|\s*`([a-z]+)`\s*\|[^|]*\|\s*`(!\[[^\]]*\]\([^)]*\))`\s*\|/gm
const JUDGMENT = /^\|\s*`([A-Za-z][A-Za-z ]*)`\s*\|\s*([^|]+?)\s*\|\s*$/gm
const CONDITION = /`([a-z]+)`\s*が(\d+)件(以上)?/g
const TOTAL = /合計(\d+)件まで/
const SOFT = /うち((?:\s*`[a-z]+`\s*(?:と\s*)?)+)は合わせて(\d+)件まで/
const LINES = /合わせて(\d+)行以内/
const ROUNDS = /再レビューが(\d+)回に達した/
const EFFORT = /effort は\s*`([a-z]+)`\s*を渡す/
const FLAG = /`(--[a-z-]+)`/g
const NAMED = /`([a-z]+)`/g
const COMMAND = /npm (?:run )?([a-z:]+)/g

const linesWith = (source, word) => source.split('\n').filter((line) => line.includes(word))

export const rules = (source) => {
	const grades = new Map([...source.matchAll(GRADE)].map(([, name, badge]) => [name, badge]))

	const judgments = [...source.matchAll(JUDGMENT)]
		.filter(([, name]) => !grades.has(name))
		.map(([, name, condition]) => ({
			name,
			needs: [...condition.matchAll(CONDITION)].map(([, grade, count, orMore]) => ({
				grade,
				count: Number(count),
				orMore: Boolean(orMore),
			})),
		}))

	const soft = SOFT.exec(source)
	const forbidden = linesWith(source, '付けない').flatMap((line) =>
		[...line.matchAll(FLAG)].map(([, flag]) => flag),
	)
	const required = linesWith(source, '先に')
		.filter((line) => line.includes('通す'))
		.flatMap((line) => [...line.matchAll(COMMAND)].map(([, name]) => name))

	return {
		grades,
		judgments,
		total: Number(TOTAL.exec(source)?.[1]),
		soft: soft ? [...soft[1].matchAll(NAMED)].map(([, name]) => name) : [],
		softTotal: Number(soft?.[2]),
		lines: Number(LINES.exec(source)?.[1]),
		rounds: Number(ROUNDS.exec(source)?.[1]),
		effort: EFFORT.exec(source)?.[1],
		forbidden,
		required,
	}
}

const complete = (it) =>
	it.grades.size > 0 &&
	it.judgments.length > 0 &&
	it.judgments.some(({ needs }) => needs.length === 0) &&
	[it.total, it.softTotal, it.lines, it.rounds].every(Number.isFinite) &&
	it.soft.length > 0 &&
	typeof it.effort === 'string'

const satisfied = (needs, counts) =>
	needs.every(({ grade, count, orMore }) =>
		orMore ? (counts[grade] ?? 0) >= count : (counts[grade] ?? 0) === count,
	)

const judged = (judgments, counts) =>
	judgments.find(({ needs }) => needs.length > 0 && satisfied(needs, counts)) ??
	judgments.find(({ needs }) => needs.length === 0)

// API の event は判定の名前を大文字にしたもの。表を2つ持たずに突き合わせる
const eventOf = (name) => name.toUpperCase().replace(/\s+/g, '_')

const key = ({ owner, repo, pullNumber }) => `review.${owner}.${repo}.${pullNumber}`

// code-review が受け取る effort の綴り。手順書ではなく呼ぶ側の語彙
const LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])

const kept = (args, { forbidden, effort }) => {
	const tokens = args.split(/\s+/).filter(Boolean)
	const left = tokens.filter((token) => !forbidden.includes(token.replace(/=.*$/, '')))
	const leveled = left.some(
		(token) => LEVELS.has(token.toLowerCase()) || /^--?effort[=:]/i.test(token),
	)
	if (tokens.length === left.length && leveled) return null
	return [...left, ...(leveled ? [] : [effort])].join(' ')
}

const skilled = (input, it, ask) => {
	const { skill, args } = input.tool_input ?? {}
	if (skill !== 'code-review') return null

	const missing = it.required.filter((name) => !ask.evidence().includes(`${name}.log`))
	if (missing.length > 0) {
		return {
			reason: `${missing.join(' と ')} の証跡が ${EVIDENCE}/ に無い。通してから呼ぶ（→ verify）`,
		}
	}

	const updated = kept(typeof args === 'string' ? args : '', it)
	return updated === null ? null : { updatedInput: { ...input.tool_input, args: updated } }
}

const graded = (body, grades) => {
	const found = [...grades].filter(([, badge]) => body.includes(badge))
	if (found.length !== 1) return { names: found.map(([name]) => name) }
	const [name, badge] = found[0]
	return { name, badge, head: body.startsWith(badge) }
}

const commented = (input, it, ask) => {
	const { body, ...where } = input.tool_input ?? {}
	if (typeof body !== 'string') return null

	const grade = graded(body, it.grades)
	if (!grade.name) {
		return {
			reason:
				grade.names.length === 0
					? `グレードのバッジが無い。${SKILL} の本文を1つだけ先頭に写す`
					: `バッジが ${grade.names.join(' と ')} の${grade.names.length}つある。1コメント1グレードに割る`,
		}
	}
	if (!grade.head) return { reason: `バッジはコメントの先頭に置く（${grade.name}）` }
	if (body.slice(grade.badge.length).split('\n')[0].trim() === '') {
		return { reason: 'バッジと同じ行に、何が起きるかを言い切る見出しを置く' }
	}

	const rows = body.split('\n').filter((line) => line.trim() !== '').length
	if (rows > it.lines) return { reason: `${rows}行ある。見出しも本文も含めて${it.lines}行以内` }

	const counts = ask.state(key(where), input).read()?.grades ?? {}
	const posted = Object.values(counts).reduce((sum, count) => sum + count, 0)
	if (posted >= it.total) return { reason: `この PR に${it.total}件出している。捨てる側で絞る` }

	const soft = it.soft.reduce((sum, name) => sum + (counts[name] ?? 0), 0)
	if (it.soft.includes(grade.name) && soft >= it.softTotal) {
		return {
			reason: `${it.soft.join(' と ')} は合わせて${it.softTotal}件まで出している`,
		}
	}
	return null
}

const SUBMITTING = new Set(['create', 'submit_pending'])

// 表は厳しい順に並ぶ。前の回から持ち越した未対応は数えられないので、
// 数えた件数より緩い側に倒した判定だけを落とす
const looser = (judgments, one, than) => judgments.indexOf(one) > judgments.indexOf(than)

const submitted = (input, it, ask) => {
	const { method, event, body, ...where } = input.tool_input ?? {}
	if (!SUBMITTING.has(method) || typeof event !== 'string') return null

	const seen = ask.state(key(where), input).read()
	if (seen === null) return null

	if ((seen.submits ?? 0) > it.rounds) {
		return {
			reason: `この PR に${it.rounds}回出し直している。残った論点を1コメントにまとめ、判断を書き手に渡す`,
		}
	}

	const want = judged(it.judgments, seen.grades ?? {})
	const head = String(body ?? '').split('\n')[0]
	const written = it.judgments.find(({ name }) => head.includes(name))
	if (!written) return { reason: `サマリの先頭行に判定（${want.name}）を置く` }

	const counts = Object.entries(seen.grades ?? {})
		.map(([name, count]) => `${name} ${count}`)
		.join(' / ')
	const softest = it.judgments.find(({ needs }) => needs.length === 0)
	// 自分の PR には REQUEST_CHANGES を返せないので、event は最も緩いものだけ見る
	const approving = event === eventOf(softest.name) && want !== softest
	if (approving || looser(it.judgments, written, want)) {
		return { reason: `件数（${counts || '0件'}）に対する判定は ${want.name}` }
	}
	return null
}

const recorded = (input, it, ask) => {
	if (input.tool_response?.isError || input.tool_response?.is_error) return
	const { method, event, body, ...where } = input.tool_input ?? {}

	if (input.tool_name === COMMENT_TOOL) {
		const grade = graded(typeof body === 'string' ? body : '', it.grades)
		if (!grade.name) return
		const box = ask.state(key(where), input)
		const seen = box.read() ?? { grades: {}, submits: 0 }
		box.write({
			...seen,
			grades: { ...seen.grades, [grade.name]: (seen.grades?.[grade.name] ?? 0) + 1 },
		})
		return
	}

	if (method === 'delete_pending' || (SUBMITTING.has(method) && typeof event === 'string')) {
		const box = ask.state(key(where), input)
		const seen = box.read() ?? { grades: {}, submits: 0 }
		box.write({
			grades: {},
			submits: (seen.submits ?? 0) + (method === 'delete_pending' ? 0 : 1),
		})
	}
}

const root = () => process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

const ASK = {
	skill: () => readFileSync(join(root(), SKILL), 'utf8'),
	evidence: () => {
		try {
			return readdirSync(join(root(), EVIDENCE))
		} catch {
			return []
		}
	},
	state,
}

export const decide = (input, ask = ASK) => {
	const tool = input.tool_name ?? ''
	if (tool !== 'Skill' && tool !== COMMENT_TOOL && tool !== REVIEW_TOOL) return null

	const it = rules(ask.skill())
	if (!complete(it)) return null

	if (input.hook_event_name === 'PostToolUse') {
		if (tool !== 'Skill') recorded(input, it, ask)
		return null
	}

	if (tool === 'Skill') return skilled(input, it, ask)
	if (tool === COMMENT_TOOL) return commented(input, it, ask)
	return submitted(input, it, ask)
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('review-guard.mjs')) {
	// 判定できないときは黙って通す。フックがツール呼び出しを止めない
	try {
		const input = JSON.parse((await read()) || '{}')
		const found = decide(input)
		if (found?.reason) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PreToolUse',
						permissionDecision: 'deny',
						permissionDecisionReason: found.reason,
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
				}),
			)
		}
	} catch {}
}
