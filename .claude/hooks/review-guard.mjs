#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { state } from './state.mjs'

const SKILL = '.claude/skills/review/SKILL.md'
const EVIDENCE = '.verify'
const COMMENT_TOOL = 'mcp__github__add_comment_to_pending_review'
const ISSUE_TOOL = 'mcp__github__add_issue_comment'
const REPLY_TOOL = 'mcp__github__add_reply_to_pull_request_comment'
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

const key = ({ owner, repo, pullNumber, issue_number: issue }) =>
	`review.${owner}.${repo}.${pullNumber ?? issue}`

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

const over = (adding, counts, it) => {
	if (sum(counts) + sum(adding) > it.total) {
		return `この PR に${it.total}件出している。捨てる側で絞る`
	}
	if (sum(counts, it.soft) + sum(adding, it.soft) > it.softTotal) {
		return `${it.soft.join(' と ')} は合わせて${it.softTotal}件まで出している`
	}
	return null
}

const graded = (body, grades) => {
	const found = [...grades].filter(([, badge]) => body.includes(badge))
	if (found.length !== 1) return { names: found.map(([name]) => name) }
	const [name, badge] = found[0]
	return { name, badge, head: body.startsWith(badge) }
}

const commented = (text, it, seen) => {
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

	return over({ [grade.name]: 1 }, seen?.grades ?? {}, it)
}

const SUBMITTING = new Set(['create', 'submit_pending'])

// 表は厳しい順に並ぶ。前の回から持ち越した未対応は数えられないので、
// 数えた件数より緩い側に倒した判定だけを落とす
const looser = (judgments, one, than) => judgments.indexOf(one) > judgments.indexOf(than)

const repeated = (seen, it) =>
	(seen?.submits ?? 0) > it.rounds
		? `この PR に${it.rounds}回出し直している。残った論点を1コメントにまとめ、判断を書き手に渡す`
		: null

const unjudged = (head, counts, it) => {
	const want = judged(it.judgments, counts)
	const written = it.judgments.find(({ name }) => head.includes(name))
	if (!written) return `サマリの先頭行に判定（${want.name}）を置く`
	return looser(it.judgments, written, want)
		? `件数（${tally(counts)}）に対する判定は ${want.name}`
		: null
}

const submitted = (text, it, seen, input) => {
	const { method, event } = input.tool_input ?? {}
	if (!SUBMITTING.has(method) || typeof event !== 'string' || seen === null) return null

	const counts = seen.grades ?? {}
	const reason = repeated(seen, it) ?? unjudged(text.split('\n')[0], counts, it)
	if (reason) return reason

	const want = judged(it.judgments, counts)
	const softest = it.judgments.find(({ needs }) => needs.length === 0)
	// 自分の PR には REQUEST_CHANGES を返せないので、event は最も緩いものだけ見る
	return event === eventOf(softest.name) && want !== softest
		? `件数（${tally(counts)}）に対する判定は ${want.name}`
		: null
}

// 自分の PR に REQUEST_CHANGES を返せない回は、レビュー1本がコメント1本で来る
const bundled = (text, it, seen) => {
	const adding = counted(text, it.grades)
	if (sum(adding) === 0) return null

	return (
		repeated(seen, it) ??
		over(adding, seen?.grades ?? {}, it) ??
		unjudged(text.split('\n')[0], merged(seen?.grades ?? {}, adding), it)
	)
}

const recorded = (input, it, ask) => {
	if (input.tool_response?.isError || input.tool_response?.is_error) return
	const { method, event, body, ...where } = input.tool_input ?? {}
	const text = typeof body === 'string' ? body : ''
	const box = ask.state(key(where), input)
	const held = () => box.read() ?? { grades: {}, submits: 0 }

	if (input.tool_name === COMMENT_TOOL) {
		const grade = graded(text, it.grades)
		if (!grade.name) return
		const seen = held()
		box.write({
			...seen,
			grades: { ...seen.grades, [grade.name]: (seen.grades?.[grade.name] ?? 0) + 1 },
		})
		return
	}

	if (input.tool_name === ISSUE_TOOL) {
		if (sum(counted(text, it.grades)) === 0) return
		box.write({ grades: {}, submits: (held().submits ?? 0) + 1 })
		return
	}

	if (method === 'delete_pending' || (SUBMITTING.has(method) && typeof event === 'string')) {
		box.write({
			grades: {},
			submits: (held().submits ?? 0) + (method === 'delete_pending' ? 0 : 1),
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

// バッジを載せられる口はどれも綴りを正本に直す。型と件数は手順書が出し先を決めている口だけ
const JUDGED = {
	[COMMENT_TOOL]: commented,
	[ISSUE_TOOL]: bundled,
	[REVIEW_TOOL]: submitted,
	[REPLY_TOOL]: () => null,
}

export const decide = (input, ask = ASK) => {
	const tool = input.tool_name ?? ''
	if (tool !== 'Skill' && !Object.hasOwn(JUDGED, tool)) return null

	const it = rules(ask.skill())
	if (!complete(it)) return null

	if (input.hook_event_name === 'PostToolUse') {
		if (tool !== 'Skill') recorded(input, it, ask)
		return null
	}

	if (tool === 'Skill') return skilled(input, it, ask)

	const { body, ...where } = input.tool_input ?? {}
	if (typeof body !== 'string' && tool !== REVIEW_TOOL) return null

	const text = respelled(typeof body === 'string' ? body : '', it.grades)
	const reason = JUDGED[tool](text, it, ask.state(key(where), input).read(), input)
	if (reason) return { reason }
	return text === body ? null : { updatedInput: { ...input.tool_input, body: text } }
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
