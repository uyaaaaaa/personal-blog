#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { read } from '../../scripts/stdin.mjs'
import { state } from './state.mjs'

const SKILL = '.claude/skills/review/SKILL.md'
const EVIDENCE = '.verify'

const GRADE = /^\|\s*`([a-z]+)`\s*\|[^|]*\|\s*`(!\[[^\]]*\]\([^)]*\))`\s*\|/gm
const JUDGMENT = /^\|\s*`([A-Za-z][A-Za-z ]*)`\s*\|\s*([^|]+?)\s*\|\s*$/gm
const CONDITION = /`([a-z]+)`\s*が(\d+)件(以上)?/g
const TOTAL = /合計(\d+)件まで/
const SOFT = /うち((?:\s*`[a-z]+`\s*(?:と\s*)?)+)は合わせて(\d+)件まで/
const LINES = /合わせて(\d+)行以内/
const ROUNDS = /再レビューが(\d+)回に達した/
const EFFORT = /effort は\s*`([a-z]+)`\s*を渡す/
const WORKFLOW = /"workflow_id":\s*"([^"]+)"/
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
		workflow: WORKFLOW.exec(source)?.[1],
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
	typeof it.effort === 'string' &&
	typeof it.workflow === 'string'

const satisfied = (needs, counts) =>
	needs.every(({ grade, count, orMore }) =>
		orMore ? (counts[grade] ?? 0) >= count : (counts[grade] ?? 0) === count,
	)

const judged = (judgments, counts) =>
	judgments.find(({ needs }) => needs.length > 0 && satisfied(needs, counts)) ??
	judgments.find(({ needs }) => needs.length === 0)

const eventOf = (name) => name.toUpperCase().replace(/\s+/g, '_')

const key = (pr) => `review.${pr}`

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

const LINK = /!?\[[^\]]*\]\(([^)]*)\)/g
const SPELLED = /^!\[[^\]]*\]\(([^)]*)\)$/

const byUrl = (grades) => {
	const found = new Map()
	for (const badge of grades.values()) {
		const url = SPELLED.exec(badge)?.[1]
		if (url !== undefined) found.set(url, badge)
	}
	return found
}

const respelled = (body, grades) => {
	const badges = byUrl(grades)
	return body.replace(LINK, (whole, url) => badges.get(url) ?? whole)
}

const counted = (body, grades) =>
	Object.fromEntries(
		[...grades]
			.map(([name, badge]) => [name, body.split(badge).length - 1])
			.filter(([, count]) => count > 0),
	)

const sum = (counts, names) =>
	Object.entries(counts)
		.filter(([name]) => names === undefined || names.includes(name))
		.reduce((total, [, count]) => total + count, 0)

const merged = (counts, adding) =>
	Object.entries(adding).reduce(
		(found, [name, count]) => ({ ...found, [name]: (found[name] ?? 0) + count }),
		{ ...counts },
	)

const tally = (counts) =>
	Object.entries(counts)
		.map(([name, count]) => `${name} ${count}`)
		.join(' / ') || '0件'

const over = (counts, it) => {
	if (sum(counts) > it.total) return `${sum(counts)}件ある。捨てる側で${it.total}件まで絞る`
	if (sum(counts, it.soft) > it.softTotal) {
		return `${it.soft.join(' と ')} が${sum(counts, it.soft)}件ある。合わせて${it.softTotal}件まで`
	}
	return null
}

const graded = (body, grades) => {
	const found = [...grades].filter(([, badge]) => body.includes(badge))
	if (found.length !== 1) return { names: found.map(([name]) => name) }
	const [name, badge] = found[0]
	return { name, badge, head: body.startsWith(badge) }
}

const commented = (text, it) => {
	const grade = graded(text, it.grades)
	if (!grade.name) {
		return grade.names.length === 0
			? `グレードのバッジが無い。${SKILL} の本文を1つだけ先頭に写す`
			: `バッジが ${grade.names.join(' と ')} の${grade.names.length}つある。1コメント1グレードに割る`
	}
	if (!grade.head) return `バッジはコメントの先頭に置く（${grade.name}）`
	if (text.slice(grade.badge.length).split('\n')[0].trim() === '') {
		return 'バッジと同じ行に、何が起きるかを言い切る見出しを置く'
	}

	const rows = text.split('\n').filter((line) => line.trim() !== '').length
	if (rows > it.lines) return `${rows}行ある。見出しも本文も含めて${it.lines}行以内`

	return null
}

const looser = (judgments, one, than) => judgments.indexOf(one) > judgments.indexOf(than)

const repeated = (seen, it) =>
	(seen?.submits ?? 0) > it.rounds
		? `この PR に${it.rounds}回出し直している。残った論点を1コメントにまとめ、判断を書き手に渡す`
		: null

const unjudged = (body, event, counts, it) => {
	const head = body.split('\n')[0]
	if (body.trim() === '' && event === 'APPROVE') return null
	const want = judged(it.judgments, counts)
	const written = it.judgments.find(({ name }) => head.includes(name))
	if (!written) return `サマリの先頭行に判定（${want.name}）を置く`
	return looser(it.judgments, written, want)
		? `件数（${tally(counts)}）に対する判定は ${want.name}`
		: null
}

const mismatched = (event, counts, it) => {
	const want = judged(it.judgments, counts)
	const written = it.judgments.find(({ name }) => eventOf(name) === event)
	if (!written) return `event は判定を大文字にしたもの（${eventOf(want.name)}）を渡す`
	return looser(it.judgments, written, want)
		? `件数（${tally(counts)}）に対する event は ${eventOf(want.name)}`
		: null
}

const PLACED = ({ path, line }) => typeof path === 'string' && Number.isFinite(line)

const validated = (payload, it, seen) => {
	const body = typeof payload.body === 'string' ? payload.body : ''
	const comments = Array.isArray(payload.comments) ? payload.comments : []
	const bodies = comments.map((one) => (typeof one?.body === 'string' ? one.body : ''))

	if ([body, ...bodies].some((text) => respelled(text, it.grades) !== text)) {
		return `バッジの綴りが正本と違う。${SKILL} の表の本文をそのまま写す`
	}
	if (!comments.every(PLACED)) return 'インラインには `path` と `line` を付ける'

	const reason = bodies.map((text) => commented(text, it)).find(Boolean)
	if (reason) return reason

	const counts = [body, ...bodies].reduce(
		(found, text) => merged(found, counted(text, it.grades)),
		{},
	)
	return (
		repeated(seen, it) ??
		over(counts, it) ??
		unjudged(body, payload.event, counts, it) ??
		mismatched(payload.event, counts, it)
	)
}

const PR = /(?:-f|-F|--raw-field|--field)\s+["']?pr=(\d+)/
const PAYLOAD = /(?:-F|--field)\s+["']?review=@([^\s"']+)/

const LEAD = String.raw`(?:^\s*|[\n;&|(]\s*)`
const RUN = new RegExp(`${LEAD}gh\\s+workflow\\s+run\\s+["']?([^\\s"']+)["']?`)

const plain = (name) =>
	name
		.replace(/^.*\//, '')
		.replace(/\.ya?ml$/, '')
		.toLowerCase()

const fromCommand = (input, it, ask) => {
	const command = input.tool_input?.command ?? ''
	const found = RUN.exec(command)?.[1]
	if (found === undefined || plain(found) !== plain(it.workflow)) return null

	const pr = PR.exec(command)?.[1]
	const path = PAYLOAD.exec(command)?.[1]
	if (!pr || !path) return { missing: '`-f pr=<番号>` と `-F review=@<ファイル>` の両方を渡す' }
	try {
		return { pr, text: ask.payload(path) }
	} catch {
		return { pr }
	}
}

const fromTool = (input, it) => {
	const { method, workflow_id: workflow, inputs } = input.tool_input ?? {}
	if (method !== 'run_workflow' || plain(String(workflow ?? '')) !== plain(it.workflow))
		return null

	const pr = inputs?.pr === undefined ? undefined : String(inputs.pr)
	if (!pr || typeof inputs?.review !== 'string') {
		return { missing: '`inputs` に `pr` と、レビューの JSON を文字列にした `review` を渡す' }
	}
	return { pr, text: inputs.review }
}

const dispatched = (input, it, ask) =>
	input.tool_name === 'Bash' ? fromCommand(input, it, ask) : fromTool(input, it)

const reviewed = (input, it, ask) => {
	const found = dispatched(input, it, ask)
	if (!found) return null
	if (found.missing) return { reason: found.missing }

	let payload
	try {
		payload = JSON.parse(found.text)
	} catch {
		return null
	}

	const reason = validated(payload, it, ask.state(key(found.pr), input).read())
	return reason ? { reason } : null
}

const recorded = (input, it, ask) => {
	if (input.tool_response?.isError || input.tool_response?.is_error) return
	const found = dispatched(input, it, ask)
	if (!found?.pr) return

	const box = ask.state(key(found.pr), input)
	box.write({ submits: (box.read()?.submits ?? 0) + 1 })
}

const root = () => process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

export const resolve = (path, base) => (isAbsolute(path) ? path : join(base, path))

const ASK = {
	skill: () => readFileSync(join(root(), SKILL), 'utf8'),
	payload: (path) => readFileSync(resolve(path, root()), 'utf8'),
	evidence: () => {
		try {
			return readdirSync(join(root(), EVIDENCE))
		} catch {
			return []
		}
	},
	state,
}

const DISPATCH = new RegExp(`${LEAD}gh\\s+workflow\\s+run\\b`)
const DIRECT = new RegExp(
	`${LEAD}gh\\s+(?:api\\b(?=[^\\n]*\\bPOST\\b)[^\\n]*/pulls/\\d+/reviews\\b|pr\\s+review\\b)`,
)
const TOOLED = /^mcp__.*pull_request_review/
const TRIGGER = /^mcp__.*actions_run_trigger$/
const POSTED =
	/^mcp__.*(add_issue_comment|update_issue_comment|add_comment_to_pending_review|add_reply_to_pull_request_comment)$/

const direct = (it) => ({
	reason: `自分のトークンで submit しない。${it.workflow} の発火に渡す（→ ${SKILL} の6）`,
})

const VERDICT = /^\s*\**判定\**\s*[:：]/m

const shaped = (text, it) =>
	(VERDICT.test(text) && it.judgments.some(({ name }) => text.includes(name))) ||
	[...it.grades.values()].some((badge) => text.includes(badge))

const posted = (input, it) => {
	const body = input.tool_input?.body
	if (typeof body !== 'string' || !shaped(body, it)) return null
	return {
		reason: `判定もグレードも通常コメントでは付かない。${it.workflow} の発火に渡す（→ ${SKILL} の6）`,
	}
}

export const decide = (input, ask = ASK) => {
	const tool = input.tool_name ?? ''
	const command = input.tool_input?.command ?? ''
	const bash = tool === 'Bash'
	const seen =
		tool === 'Skill' ||
		TOOLED.test(tool) ||
		TRIGGER.test(tool) ||
		POSTED.test(tool) ||
		(bash && (DISPATCH.test(command) || DIRECT.test(command)))
	if (!seen) return null

	const it = rules(ask.skill())
	if (!complete(it)) return null

	if (input.hook_event_name === 'PostToolUse') {
		if (bash || TRIGGER.test(tool)) recorded(input, it, ask)
		return null
	}

	if (tool === 'Skill') return skilled(input, it, ask)
	if (TOOLED.test(tool) || DIRECT.test(command)) return direct(it)
	if (POSTED.test(tool)) return posted(input, it)
	return reviewed(input, it, ask)
}

if (process.argv[1]?.endsWith('review-guard.mjs')) {
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
