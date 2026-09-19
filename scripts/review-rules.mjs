const GRADE = /^\|\s*`([a-z]+)`\s*\|[^|]*\|\s*`(!\[[^\]]*\]\([^)]*\))`\s*\|/gm
const JUDGMENT = /^\|\s*`([A-Za-z][A-Za-z ]*)`\s*\|\s*([^|]+?)\s*\|\s*$/gm
const CONDITION = /`([a-z]+)`\s*が(\d+)件(以上)?/g
const TOTAL = /合計(\d+)件まで/
const SOFT = /うち((?:\s*`[a-z]+`\s*(?:と\s*)?)+)は合わせて(\d+)件まで/
const LINES = /合わせて(\d+)行以内/
const BODY_LINES = /\|\s*本文\s*\|\s*(\d+)行以内/
const ROUNDS = /再レビューが(\d+)回に達した/
const EFFORT = /effort は\s*`([a-z]+)`\s*を渡す/
const WORKFLOW = /"workflow_id":\s*"([^"]+)"/
const REF = /"ref":\s*"([^"]+)"/
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
		bodyLines: Number(BODY_LINES.exec(source)?.[1]),
		rounds: Number(ROUNDS.exec(source)?.[1]),
		effort: EFFORT.exec(source)?.[1],
		workflow: WORKFLOW.exec(source)?.[1],
		ref: REF.exec(source)?.[1],
		forbidden,
		required,
	}
}

export const complete = (it) =>
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

export const judged = (judgments, counts) =>
	judgments.find(({ needs }) => needs.length > 0 && satisfied(needs, counts)) ??
	judgments.find(({ needs }) => needs.length === 0)

export const eventOf = (name) => name.toUpperCase().replace(/\s+/g, '_')
