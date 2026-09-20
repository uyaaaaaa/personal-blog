import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const STEPS = 'SKILL.md'
const REFERENCES = 'references'

const referenced = (dir) => {
	try {
		return readdirSync(join(dir, REFERENCES))
			.filter((name) => name.endsWith('.md'))
			.sort()
			.map((name) => join(dir, REFERENCES, name))
	} catch {
		return []
	}
}

export const source = (dir) =>
	[join(dir, STEPS), ...referenced(dir)].map((path) => readFileSync(path, 'utf8')).join('\n')

const GRADE = /^\|\s*`([a-z]+)`\s*\|[^|]*\|\s*`(!\[[^\]]*\]\([^)]*\))`\s*\|/gm
const JUDGMENT = /^\|\s*`([A-Za-z][A-Za-z ]*)`\s*\|\s*([^|]+?)\s*\|\s*$/gm
const CONDITION = /`([a-z]+)`\s*が(\d+)件(以上)?/g
const TOTAL = /合計(\d+)件まで/
const SOFT = /うち((?:\s*`[a-z]+`\s*(?:と\s*)?)+)は合わせて(\d+)件まで/
const LINES = /合わせて(\d+)行以内/
const BODY_LINES = /\|\s*本文\s*\|\s*(\d+)行以内/
const ROUNDS = /再レビューが(\d+)回に達した/
const WORKFLOW = /"workflow_id":\s*"([^"]+)"/
const REF = /"ref":\s*"([^"]+)"/
const NAMED = /`([a-z]+)`/g

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
	return {
		grades,
		judgments,
		total: Number(TOTAL.exec(source)?.[1]),
		soft: soft ? [...soft[1].matchAll(NAMED)].map(([, name]) => name) : [],
		softTotal: Number(soft?.[2]),
		lines: Number(LINES.exec(source)?.[1]),
		bodyLines: Number(BODY_LINES.exec(source)?.[1]),
		rounds: Number(ROUNDS.exec(source)?.[1]),
		workflow: WORKFLOW.exec(source)?.[1],
		ref: REF.exec(source)?.[1],
	}
}

export const complete = (it) =>
	it.grades.size > 0 &&
	it.judgments.length > 0 &&
	it.judgments.some(({ needs }) => needs.length === 0) &&
	[it.total, it.softTotal, it.lines, it.rounds].every(Number.isFinite) &&
	it.soft.length > 0 &&
	typeof it.workflow === 'string'

const satisfied = (needs, counts) =>
	needs.every(({ grade, count, orMore }) =>
		orMore ? (counts[grade] ?? 0) >= count : (counts[grade] ?? 0) === count,
	)

export const judged = (judgments, counts) =>
	judgments.find(({ needs }) => needs.length > 0 && satisfied(needs, counts)) ??
	judgments.find(({ needs }) => needs.length === 0)

export const eventOf = (name) => name.toUpperCase().replace(/\s+/g, '_')
