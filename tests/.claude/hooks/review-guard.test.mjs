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

const bundle = (body, event = 'PreToolUse') => ({
	hook_event_name: event,
	tool_name: 'mcp__github__add_issue_comment',
	tool_input: { owner: WHERE.owner, repo: WHERE.repo, issue_number: WHERE.pullNumber, body },
})

const reply = (body) => ({
	hook_event_name: 'PreToolUse',
	tool_name: 'mcp__github__add_reply_to_pull_request_comment',
	tool_input: { ...WHERE, commentID: 12, body },
})

const REVIEW = [
	'**判定: Request changes** — 目次の開閉が生成 HTML に出ない。',
	'',
	'- must 1',
	'',
	'---',
	'',
	`${MUST} **静的生成の HTML では閉じたままになる**`,
	'',
	'初期状態がビルド時に焼き付く。',
].join('\n')

const dropped = (body) => body.replaceAll('![', '[')

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

	it('名前に測ったものを含むだけのファイルは証跡にしない', () => {
		const evidence = ['latest.png', 'lint.log']
		expect(decide(skill('medium'), ask({ evidence }))?.reason).toMatch(/test/)
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

	it('綴りの違うバッジを正本に直して通す', () => {
		const body = dropped(`${MUST} **見出し**\n\n理由`)
		expect(decide(comment(body), ask())).toEqual({
			updatedInput: {
				...comment(body).tool_input,
				body: `${MUST} **見出し**\n\n理由`,
			},
		})
	})

	it('バッジでないリンクは書き換えない', () => {
		const body = `${MUST} **見出し**\n\n[ADR 11](../../docs/adr/11-no-enforcement-inventory.md) のとおり`
		expect(decide(comment(body), ask())).toBeNull()
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

	it('件数より緩い判定を落とす', () => {
		const held = { grades: { must: 1 }, submits: 0 }
		expect(decide(submit('COMMENT', '**判定: Comment**'), ask({ held }))?.reason).toMatch(
			/Request changes/,
		)

		const soft = { grades: { suggestion: 1 }, submits: 0 }
		expect(decide(submit('APPROVE', '**判定: Approve**'), ask({ held: soft }))?.reason).toMatch(
			/Comment/,
		)
	})

	it('数えた件数より厳しい判定は通す', () => {
		const held = { grades: {}, submits: 1 }
		expect(
			decide(submit('COMMENT', '**判定: Request changes** — 未対応 2件'), ask({ held })),
		).toBeNull()
	})

	it('自分の PR で REQUEST_CHANGES を返せない submit を通す', () => {
		const held = { grades: { must: 1 }, submits: 0 }
		expect(decide(submit('COMMENT', '**判定: Request changes**'), ask({ held }))).toBeNull()
	})

	it('判定を書いていないサマリを落とす', () => {
		const held = { grades: { suggestion: 1 }, submits: 0 }
		expect(decide(submit('COMMENT', '直せば良くなる'), ask({ held }))?.reason).toMatch(/先頭行/)
	})

	it('3回の出し直しを通し、その次を落とす', () => {
		const passing = { grades: {}, submits: 3 }
		expect(decide(submit('APPROVE', '**判定: Approve**'), ask({ held: passing }))).toBeNull()

		const held = { grades: {}, submits: 4 }
		expect(decide(submit('APPROVE', '**判定: Approve**'), ask({ held }))?.reason).toMatch(/3回/)
	})

	it('サマリの無い submit を落とす', () => {
		const held = { grades: {}, submits: 0 }
		expect(decide(submit('APPROVE'), ask({ held }))?.reason).toMatch(/先頭行/)
	})

	it('body を持たない呼び出しに空の body を足さない', () => {
		const bodiless = (method, event) => ({
			hook_event_name: 'PreToolUse',
			tool_name: 'mcp__github__pull_request_review_write',
			tool_input: { ...WHERE, method, ...(event !== undefined && { event }) },
		})
		const held = { grades: {}, submits: 0 }
		expect(decide(bodiless('delete_pending'), ask({ held }))).toBeNull()
		expect(decide(bodiless('resolve_thread'), ask({ held }))).toBeNull()
		expect(decide(bodiless('submit_pending', 'APPROVE'), ask({ held }))?.reason).toMatch(
			/先頭行/,
		)
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

describe('コメント1本で返したレビュー', () => {
	it('綴りを直し、件数に合う判定を通す', () => {
		expect(decide(bundle(dropped(REVIEW)), ask())).toEqual({
			updatedInput: { ...bundle(REVIEW).tool_input, body: REVIEW },
		})
		expect(decide(bundle(REVIEW), ask())).toBeNull()
	})

	it('件数より緩い判定を落とす', () => {
		const body = REVIEW.replace('Request changes', 'Comment')
		expect(decide(bundle(body), ask())?.reason).toMatch(/Request changes/)
	})

	it('判定の無いサマリを落とす', () => {
		expect(
			decide(bundle(REVIEW.replace('**判定: Request changes** — ', '')), ask())?.reason,
		).toMatch(/先頭行/)
	})

	it('本文のバッジを数えて上限を見る', () => {
		const many = REVIEW + `\n\n${MUST} **見出し**`.repeat(5)
		expect(decide(bundle(many), ask())?.reason).toMatch(/5件/)

		const soft = REVIEW.replace(MUST, NITS) + `\n\n${NITS} **見出し**`.repeat(2)
		expect(decide(bundle(soft), ask())?.reason).toMatch(/合わせて2件/)
	})

	it('インラインで出した件数と合わせて見る', () => {
		const held = { grades: { must: 3, suggestion: 2 }, submits: 0 }
		expect(decide(bundle(REVIEW), ask({ held }))?.reason).toMatch(/5件/)
	})

	it('4回目の出し直しを落とす', () => {
		const held = { grades: {}, submits: 4 }
		expect(decide(bundle(REVIEW), ask({ held }))?.reason).toMatch(/3回/)
	})

	it('バッジの無いコメントは見ない', () => {
		expect(decide(bundle('直して push しました'), ask())).toBeNull()
	})

	it('1回の出し直しとして数え、件数を畳む', () => {
		const it_ = ask({ held: { grades: { must: 2 }, submits: 1 } })
		decide(bundle(REVIEW, 'PostToolUse'), it_)
		expect(it_.box.value).toEqual({ grades: {}, submits: 2 })
	})

	it('バッジの無いコメントは数えない', () => {
		const it_ = ask({ held: { grades: { must: 2 }, submits: 1 } })
		decide(bundle('直して push しました', 'PostToolUse'), it_)
		expect(it_.box.value).toEqual({ grades: { must: 2 }, submits: 1 })
	})
})

describe('スレッドへの返信', () => {
	it('綴りだけ直し、インラインの型は見ない', () => {
		expect(decide(reply(dropped(`${NITS} 見出し`)), ask())).toEqual({
			updatedInput: { ...reply('').tool_input, body: `${NITS} 見出し` },
		})
		expect(decide(reply('直しました'), ask())).toBeNull()
	})
})
