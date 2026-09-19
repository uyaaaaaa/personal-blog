import { readFileSync } from 'node:fs'
import { complete, eventOf, judged, rules } from './review-rules.mjs'
import { read } from './stdin.mjs'

const SKILL = new URL('../.claude/skills/review/SKILL.md', import.meta.url)

const USAGE = [
	'使い方: node scripts/review-args.mjs < review.json',
	'',
	'渡す JSON:',
	'  { "pr": 123,',
	'    "reason": "判定の理由1文",',
	'    "verified": "`npm run lint` `npm test` は終了コード 0",',
	'    "comments": [',
	'      { "grade": "must", "path": "app/x.vue", "line": 12,',
	'        "heading": "静的生成の HTML では閉じたままになる", "body": "理由。\\n代案。" }',
	'    ] }',
	'',
	'判定・バッジ・件数の上限は review スキルから読む。',
	'出力の JSON をそのまま mcp__github__actions_run_trigger に渡す。',
]

const text = (value) => (typeof value === 'string' ? value.trim() : '')

const lines = (value) => text(value).split('\n').length

export const counted = (comments, { grades }) =>
	Object.fromEntries(
		[...grades.keys()]
			.map((name) => [name, comments.filter((comment) => comment.grade === name).length])
			.filter(([, count]) => count > 0),
	)

export const verdict = (comments, it) => judged(it.judgments, counted(comments, it))

const sum = (counts, names) =>
	Object.entries(counts)
		.filter(([name]) => names === undefined || names.includes(name))
		.reduce((total, [, count]) => total + count, 0)

const inComment = (comment, at, it) => {
	const where = `${at + 1}件目`
	const found = []
	if (!it.grades.has(comment.grade)) {
		found.push(`${where}: 型に無いグレード（${[...it.grades.keys()].join(' / ')} から1つ）`)
	}
	if (text(comment.path) === '') found.push(`${where}: path が無い`)
	if (!Number.isInteger(comment.line) || comment.line < 1) {
		found.push(`${where}: line は差分に付く行番号で渡す`)
	}
	if (text(comment.heading) === '') found.push(`${where}: 見出しが無い`)
	if (text(comment.body) === '') found.push(`${where}: 本文が無い`)
	else if (lines(comment.body) > it.bodyLines) {
		found.push(`${where}: 本文が ${lines(comment.body)} 行（${it.bodyLines}行以内）`)
	}
	// バッジと見出しは本文の外側に1行増える。ガードは空行を数えない
	const rows = lines(comment.body) + 1
	if (rows > it.lines) found.push(`${where}: コメントが ${rows} 行（${it.lines}行以内）`)
	return found
}

export const findings = (review, it) => {
	const comments = Array.isArray(review.comments) ? review.comments : []
	const found = []

	if (!Number.isInteger(review.pr) || review.pr < 1) found.push('pr に PR の番号を入れる')
	if (!Array.isArray(review.comments)) found.push('comments は配列で渡す（0件なら空配列）')

	const counts = counted(comments, it)
	if (comments.length > it.total) {
		found.push(`指摘が ${comments.length} 件（合計${it.total}件まで）`)
	}
	if (sum(counts, it.soft) > it.softTotal) {
		found.push(
			`${it.soft.join(' と ')} が ${sum(counts, it.soft)} 件（合わせて${it.softTotal}件まで）`,
		)
	}

	found.push(...comments.flatMap((comment, at) => inComment(comment, at, it)))

	// Approve にサマリは書かないので、理由も実測も要らない
	if (verdict(comments, it).needs.length > 0) {
		if (text(review.reason) === '') found.push('判定の理由1文を reason に入れる')
		if (text(review.verified) === '') found.push('実測の状態を verified に入れる')
	}
	return found
}

const summary = (review, it) => {
	const counts = counted(review.comments, it)
	return [
		`**判定: ${verdict(review.comments, it).name}** — ${text(review.reason)}`,
		'',
		`- ${Object.entries(counts)
			.map(([name, count]) => `${name} ${count}`)
			.join(' / ')}`,
		`- 実測: ${text(review.verified)}`,
	].join('\n')
}

const badged = (comment, it) => ({
	path: text(comment.path),
	line: comment.line,
	body: `${it.grades.get(comment.grade)} **${text(comment.heading)}**\n\n${text(comment.body)}`,
})

export const args = (review, it) => {
	const found = findings(review, it)
	if (found.length > 0) return { error: found }

	const chosen = verdict(review.comments, it)
	const payload = {
		event: eventOf(chosen.name),
		...(chosen.needs.length > 0 ? { body: summary(review, it) } : {}),
		...(review.comments.length > 0
			? { comments: review.comments.map((comment) => badged(comment, it)) }
			: {}),
	}

	return {
		method: 'run_workflow',
		workflow_id: it.workflow,
		ref: it.ref,
		inputs: { pr: String(review.pr), review: JSON.stringify(payload) },
	}
}

const fail = (found) => {
	for (const line of [...found, ...(found.length > 0 ? [''] : []), ...USAGE]) console.error(line)
	process.exit(1)
}

const main = async () => {
	let review
	try {
		review = JSON.parse((await read()) || 'null')
	} catch (error) {
		fail([`レビューの JSON として読めない（${error.message}）`])
	}
	if (review === null || typeof review !== 'object' || Array.isArray(review)) {
		fail(['レビューの JSON を標準入力に渡す'])
	}

	const it = rules(readFileSync(SKILL, 'utf8'))
	if (!complete(it) || !Number.isFinite(it.bodyLines) || typeof it.ref !== 'string') {
		fail([`判定とグレードを ${SKILL.pathname} から読めない`])
	}

	const built = args(review, it)
	if (built.error) fail(built.error)

	console.log(JSON.stringify(built, null, 2))
}

if (process.argv[1]?.endsWith('review-args.mjs')) await main()
