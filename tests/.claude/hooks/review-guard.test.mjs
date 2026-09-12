import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decide, rules } from '~~/.claude/hooks/review-guard.mjs'

const SOURCE = readFileSync(
	new URL('../../../.claude/skills/review/SKILL.md', import.meta.url),
	'utf8',
)

const MUST = '![must](https://img.shields.io/badge/must-d73a4a)'
const SUGGESTION = '![suggestion](https://img.shields.io/badge/suggestion-fbca04)'
const NITS = '![nits](https://img.shields.io/badge/nits-cfd3d7)'

const WHERE = { owner: 'uyaaaaaa', repo: 'personal-blog', pullNumber: 294 }

const ask = ({ evidence = ['lint.log', 'test.log'], held = null, source = SOURCE } = {}) => {
	const box = { value: held }
	return {
		skill: () => source,
		evidence: () => evidence,
		state: () => ({
			read: () => box.value,
			write: (value) => {
				box.value = value
			},
		}),
		box,
	}
}

const skill = (args) => ({
	hook_event_name: 'PreToolUse',
	tool_name: 'Skill',
	tool_input: { skill: 'code-review', ...(args !== undefined && { args }) },
})

const comment = (body, event = 'PreToolUse') => ({
	hook_event_name: event,
	tool_name: 'mcp__github__add_comment_to_pending_review',
	tool_input: { ...WHERE, path: 'app/app.vue', subjectType: 'LINE', body },
})

const submit = (event, body = '', method = 'submit_pending', name = 'PreToolUse') => ({
	hook_event_name: name,
	tool_name: 'mcp__github__pull_request_review_write',
	tool_input: { ...WHERE, method, event, body },
})

describe('rules', () => {
	it('バッジも判定も件数も手順書から読む', () => {
		const it_ = rules(SOURCE)
		expect([...it_.grades.keys()]).toEqual(['must', 'suggestion', 'imo', 'nits'])
		expect(it_.grades.get('must')).toBe(MUST)
		expect(it_.judgments.map(({ name }) => name)).toEqual([
			'Request changes',
			'Comment',
			'Approve',
		])
		expect(it_.judgments.at(-1).needs).toEqual([])
		expect(it_).toMatchObject({
			total: 5,
			soft: ['imo', 'nits'],
			softTotal: 2,
			lines: 6,
			rounds: 3,
			effort: 'medium',
			forbidden: ['--comment', '--fix'],
			required: ['test', 'lint'],
		})
	})
})

describe('code-review の呼び出し', () => {
	it('`--comment` `--fix` を落として effort を補う', () => {
		expect(decide(skill('--fix --comment 307'), ask())).toEqual({
			updatedInput: { skill: 'code-review', args: '307 medium' },
		})
		expect(decide(skill(), ask())).toEqual({
			updatedInput: { skill: 'code-review', args: 'medium' },
		})
	})

	it('effort だけ渡した呼び出しは触らない', () => {
		expect(decide(skill('high'), ask())).toBeNull()
		expect(decide(skill('--effort=high'), ask())).toBeNull()
	})

	it('lint か test の証跡が無いと落とす', () => {
		expect(decide(skill('medium'), ask({ evidence: [] }))?.reason).toMatch(/test と lint/)
		expect(decide(skill('medium'), ask({ evidence: ['lint.log'] }))?.reason).toMatch(/test/)
		expect(decide(skill('medium'), ask({ evidence: ['test.log', 'lint.log'] }))).toBeNull()
	})

	it('他のスキルは見ない', () => {
		expect(decide({ ...skill(), tool_input: { skill: 'review' } }, ask())).toBeNull()
	})
})

describe('インラインコメントの型', () => {
	it('型に合うコメントは通す', () => {
		expect(
			decide(comment(`${MUST} **静的生成では閉じたままになる**\n\n理由\n代案`), ask()),
		).toBeNull()
	})

	it('バッジの無いコメントと2つ付いたコメントを落とす', () => {
		expect(decide(comment('**見出し**\n本文'), ask())?.reason).toMatch(/バッジが無い/)
		expect(decide(comment(`${MUST}${NITS} **見出し**`), ask())?.reason).toMatch(/2つ/)
	})

	it('先頭に無いバッジと、見出しの無いコメントを落とす', () => {
		expect(decide(comment(`**見出し** ${MUST}`), ask())?.reason).toMatch(/先頭/)
		expect(decide(comment(`${MUST}\n本文`), ask())?.reason).toMatch(/見出し/)
	})

	it('6行を超えるコメントを落とす', () => {
		const body = `${MUST} **見出し**\n\n1\n2\n3\n4\n5\n6`
		expect(decide(comment(body), ask())?.reason).toMatch(/6行以内/)
	})

	it('6件目を落とす', () => {
		const held = { grades: { must: 3, suggestion: 2 }, submits: 0 }
		expect(decide(comment(`${MUST} **見出し**`), ask({ held }))?.reason).toMatch(/5件/)
		held.grades.suggestion = 1
		expect(decide(comment(`${MUST} **見出し**`), ask({ held }))).toBeNull()
	})

	it('imo と nits の3件目だけを落とす', () => {
		const held = { grades: { imo: 1, nits: 1 }, submits: 0 }
		expect(decide(comment(`${NITS} **見出し**`), ask({ held }))?.reason).toMatch(/合わせて2件/)
		expect(decide(comment(`${MUST} **見出し**`), ask({ held }))).toBeNull()
	})
})

describe('submit の判定', () => {
	it('件数に合う判定は通す', () => {
		const held = { grades: { must: 1, suggestion: 1 }, submits: 0 }
		expect(
			decide(submit('REQUEST_CHANGES', '**判定: Request changes** — 理由'), ask({ held })),
		).toBeNull()
	})

	it('件数と食い違う判定を落とす', () => {
		const held = { grades: { must: 1 }, submits: 0 }
		expect(decide(submit('COMMENT', '**判定: Comment**'), ask({ held }))?.reason).toMatch(
			/Request changes/,
		)

		const soft = { grades: { imo: 2 }, submits: 0 }
		expect(decide(submit('COMMENT', '**判定: Comment**'), ask({ held: soft }))?.reason).toMatch(
			/Approve/,
		)
		expect(decide(submit('APPROVE', '**判定: Approve**'), ask({ held: soft }))).toBeNull()
	})

	it('判定を書いていないサマリを落とす', () => {
		const held = { grades: { suggestion: 1 }, submits: 0 }
		expect(decide(submit('COMMENT', '直せば良くなる'), ask({ held }))?.reason).toMatch(/先頭行/)
	})

	it('4回目の submit を落とす', () => {
		const held = { grades: {}, submits: 3 }
		expect(decide(submit('APPROVE', '**判定: Approve**'), ask({ held }))?.reason).toMatch(/3回/)
	})

	it('サマリの無い submit を落とす', () => {
		const held = { grades: {}, submits: 0 }
		expect(decide(submit('APPROVE'), ask({ held }))?.reason).toMatch(/先頭行/)
	})

	it('数えていない PR の submit は通す', () => {
		expect(decide(submit('APPROVE'), ask())).toBeNull()
		expect(decide(submit('COMMENT'), ask())).toBeNull()
	})

	it('submit でない呼び出しは見ない', () => {
		expect(
			decide(submit(undefined, '', 'create'), ask({ held: { grades: { must: 1 } } })),
		).toBeNull()
		expect(
			decide(submit('APPROVE', '', 'delete_pending'), ask({ held: { grades: { must: 1 } } })),
		).toBeNull()
	})
})

describe('件数を数える', () => {
	it('出したコメントのグレードを数える', () => {
		const it_ = ask()
		expect(decide(comment(`${MUST} **見出し**`, 'PostToolUse'), it_)).toBeNull()
		decide(comment(`${SUGGESTION} **見出し**`, 'PostToolUse'), it_)
		expect(it_.box.value).toEqual({ grades: { must: 1, suggestion: 1 }, submits: 1 - 1 })
	})

	it('落ちた呼び出しは数えない', () => {
		const it_ = ask()
		decide(
			{ ...comment(`${MUST} **見出し**`, 'PostToolUse'), tool_response: { isError: true } },
			it_,
		)
		expect(it_.box.value).toBeNull()
	})

	it('submit で件数を畳んで回数を足す', () => {
		const it_ = ask({ held: { grades: { must: 2 }, submits: 1 } })
		decide(submit('REQUEST_CHANGES', '', 'submit_pending', 'PostToolUse'), it_)
		expect(it_.box.value).toEqual({ grades: {}, submits: 2 })
	})

	it('取り下げたレビューは件数だけ畳む', () => {
		const it_ = ask({ held: { grades: { must: 2 }, submits: 1 } })
		decide(submit(undefined, '', 'delete_pending', 'PostToolUse'), it_)
		expect(it_.box.value).toEqual({ grades: {}, submits: 1 })
	})
})

describe('読み取れないとき', () => {
	it('手順書から判定を組み立てられなければ黙って通す', () => {
		const broken = ask({ source: '# レビュー\n\n何も表が無い' })
		expect(decide(comment('本文だけ'), broken)).toBeNull()
		expect(decide(skill(), broken)).toBeNull()
	})

	it('他のツールは見ない', () => {
		expect(decide({ tool_name: 'Bash', tool_input: { command: 'ls' } }, ask())).toBeNull()
		expect(decide({}, ask())).toBeNull()
	})
})
