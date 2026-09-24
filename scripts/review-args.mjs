import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { complete, eventOf, judged, rules, source } from './review-rules.mjs'
import { read } from './stdin.mjs'

const SKILL = '.claude/skills/review'

const USAGE = [
	'使い方: node scripts/review-args.mjs < findings.json',
	'',
	'渡す JSON:',
	'  { "reason": "判定の理由1文",',
	'    "verified": "CI の lint / test / typecheck は緑",',
	'    "comments": [',
	'      { "grade": "must", "path": "app/x.vue", "line": 12,',
	'        "heading": "静的生成の HTML では閉じたままになる", "body": "理由。\\n代案。" }',
	'    ] }',
	'',
	'判定・バッジ・件数の上限は review スキルから読む。',
	'出力の JSON が PR に投稿するレビュー。REVIEW_OUT があれば、そのファイルにも書く。',
]

const text = (value) => (typeof value === 'string' ? value.trim() : '')

// ガードは空行を数えない。同じ行数を見るために、ここでも落としてから数える
const rows = (value) =>
	text(value)
		.split('\n')
		.filter((line) => line.trim() !== '')

const FENCE = /^\s*```/

// 本文の上限はコード片の外側に当てる。手順書は本文とコード片を別々に数える
const prose = (lines) => {
	let inside = false
	return lines.filter((line) => {
		if (!FENCE.test(line)) return !inside
		inside = !inside
		return false
	})
}

const shaped = (comment) => comment !== null && typeof comment === 'object'

export const counted = (comments, { grades }) =>
	Object.fromEntries(
		[...grades.keys()]
			.map((name) => [name, comments.filter((comment) => comment?.grade === name).length])
			.filter(([, count]) => count > 0),
	)

export const verdict = (comments, it) => judged(it.judgments, counted(comments, it))

const sum = (counts, names) =>
	Object.entries(counts)
		.filter(([name]) => names === undefined || names.includes(name))
		.reduce((total, [, count]) => total + count, 0)

const inComment = (comment, at, it) => {
	const where = `${at + 1}件目`
	if (!shaped(comment)) return [`${where}: 指摘は { grade, path, line, heading, body } で渡す`]

	const found = []
	if (!it.grades.has(comment.grade)) {
		found.push(`${where}: 型に無いグレード（${[...it.grades.keys()].join(' / ')} から1つ）`)
	}
	if (text(comment.path) === '') found.push(`${where}: path が無い`)
	if (!Number.isInteger(comment.line) || comment.line < 1) {
		found.push(`${where}: line は差分に付く行番号で渡す`)
	}
	if (text(comment.heading) === '') found.push(`${where}: 見出しが無い`)

	const body = rows(comment.body)
	if (body.length === 0) found.push(`${where}: 本文が無い`)
	else if (prose(body).length > it.bodyLines) {
		found.push(`${where}: 本文が ${prose(body).length} 行（${it.bodyLines}行以内）`)
	}
	// バッジと見出しは本文の外側に1行増える
	if (body.length + 1 > it.lines) {
		found.push(`${where}: コメントが ${body.length + 1} 行（${it.lines}行以内）`)
	}
	return found
}

export const findings = (review, it) => {
	const comments = Array.isArray(review.comments) ? review.comments : []
	const found = []

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
	return {
		event: eventOf(chosen.name),
		...(chosen.needs.length > 0 ? { body: summary(review, it) } : {}),
		...(review.comments.length > 0
			? { comments: review.comments.map((comment) => badged(comment, it)) }
			: {}),
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

	const it = rules(source(fileURLToPath(new URL(`../${SKILL}`, import.meta.url))))
	if (!complete(it) || !Number.isFinite(it.bodyLines)) {
		fail([`判定とグレードを ${SKILL} から読めない`])
	}

	const built = args(review, it)
	if (built.error) fail(built.error)

	const out = JSON.stringify(built, null, 2)
	if (process.env.REVIEW_OUT) writeFileSync(process.env.REVIEW_OUT, out)
	console.log(out)
}

if (process.argv[1]?.endsWith('review-args.mjs')) await main()
