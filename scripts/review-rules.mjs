import { readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

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

export const resolve = (path, base) => (isAbsolute(path) ? path : join(base, path))

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

export const plain = (name) =>
	name
		.replace(/^.*\//, '')
		.replace(/\.ya?ml$/, '')
		.toLowerCase()

// 行頭か区切りの直後だけを発火と見る。文字列の中やコメントの `gh` に当てない
export const LEAD = String.raw`(?:^\s*|[\n;&|(]\s*)`
const RUN = new RegExp(`${LEAD}gh\\s+workflow\\s+run\\s+["']?([^\\s"']+)["']?`)
const PR = /(?:-f|-F|--raw-field|--field)\s+["']?pr=(\d+)/
const PAYLOAD = /(?:-F|--field)\s+["']?review=@([^\s"']+)/

// 発火は MCP の呼び出しと `gh workflow run` の2経路。数える側も検査する側も同じ読み方で見る
export const dispatched = (input) => {
	if (input.tool_name === 'Bash') {
		const command = input.tool_input?.command ?? ''
		const workflow = RUN.exec(command)?.[1]
		if (workflow === undefined) return null
		return { workflow, pr: PR.exec(command)?.[1], path: PAYLOAD.exec(command)?.[1] }
	}

	const { method, workflow_id: workflow, inputs } = input.tool_input ?? {}
	if (method !== 'run_workflow' || typeof workflow !== 'string') return null
	return {
		workflow,
		pr: inputs?.pr === undefined ? undefined : String(inputs.pr),
		review: typeof inputs?.review === 'string' ? inputs.review : undefined,
	}
}
