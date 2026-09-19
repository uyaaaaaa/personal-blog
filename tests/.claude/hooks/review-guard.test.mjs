import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decide, resolve, rules } from '~~/.claude/hooks/review-guard.mjs'

const SOURCE = readFileSync(
	new URL('../../../.claude/skills/review/SKILL.md', import.meta.url),
	'utf8',
)

const MUST = '![must-badge](https://img.shields.io/badge/review-must-d73a4a)'
const IMO = '![imo-badge](https://img.shields.io/badge/review-imo-0075ca)'
const NITS = '![nits-badge](https://img.shields.io/badge/review-nits-cfd3d7)'

const PATH = 'review.json'

const ask = ({
	evidence = ['lint.log', 'test.log'],
	held = null,
	source = SOURCE,
	review,
} = {}) => {
	const box = { value: held }
	return {
		skill: () => source,
		payload: () => (typeof review === 'string' ? review : JSON.stringify(review)),
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

const run = (command, event = 'PreToolUse') => ({
	hook_event_name: event,
	tool_name: 'Bash',
	tool_input: { command },
})

const dispatch = (event = 'PreToolUse', pr = 294) =>
	run(`gh workflow run review.yml -f pr=${pr} -F review=@${PATH}`, event)

const trigger = (payload, { event = 'PreToolUse', pr = 294, workflow = 'review.yml' } = {}) => ({
	hook_event_name: event,
	tool_name: 'mcp__github__actions_run_trigger',
	tool_input: {
		method: 'run_workflow',
		workflow_id: workflow,
		ref: 'main',
		inputs: { pr: String(pr), review: JSON.stringify(payload) },
	},
})

const posted = (body, tool = 'mcp__github__add_issue_comment') => ({
	hook_event_name: 'PreToolUse',
	tool_name: tool,
	tool_input: { pullNumber: 294, body },
})

const inline = (body, place = {}) => ({ path: 'app/app.vue', line: 12, body, ...place })

const review = (over = {}) => ({
	event: 'REQUEST_CHANGES',
	body: '**判定: Request changes** — 目次の開閉が生成 HTML に出ない。\n\n- must 1',
	comments: [inline(`${MUST} **静的生成の HTML では閉じたままになる**\n\n初期状態が焼き付く。`)],
	...over,
})

const dropped = (body) => body.replaceAll('![', '[')

describe('rules', () => {
	it('バッジも判定も件数も投稿先も手順書から読む', () => {
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
			workflow: 'review.yml',
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

describe('投稿の呼び出し', () => {
	it('型に合うレビューは通す', () => {
		expect(decide(dispatch(), ask({ review: review() }))).toBeNull()
	})

	it('番号もファイルも渡さない呼び出しを落とす', () => {
		const bare = run('gh workflow run review.yml')
		expect(decide(bare, ask({ review: review() }))?.reason).toMatch(/pr=/)
	})

	it('他のワークフローは見ない', () => {
		expect(decide(run('gh workflow run lint.yml'), ask({ review: review() }))).toBeNull()
	})

	it('綴りの違う発火も同じ判定で見る', () => {
		const loose = review({ event: 'COMMENT' })
		for (const name of ['Review', '"review.yml"', '.github/workflows/review.yml']) {
			const called = run(`gh workflow run ${name} -f pr=294 -F review=@${PATH}`)
			expect(decide(called, ask({ review: loose }))?.reason).toMatch(/REQUEST_CHANGES/)
		}
	})

	it('ワークフローを通らない投稿を落とす', () => {
		const api = run('gh api --method POST repos/o/r/pulls/294/reviews --input review.json')
		expect(decide(api, ask())?.reason).toMatch(/review\.yml/)
		expect(decide(run('gh pr review 294 --approve'), ask())?.reason).toMatch(/review\.yml/)

		const tooled = {
			hook_event_name: 'PreToolUse',
			tool_name: 'mcp__github__pull_request_review_write',
			tool_input: { pullNumber: 294, method: 'submit_pending', event: 'APPROVE' },
		}
		expect(decide(tooled, ask())?.reason).toMatch(/review\.yml/)
	})

	it('投稿でない Bash は見ない', () => {
		const quoted = run(`echo "gh workflow run review.yml -f pr=294" >> notes.md`)
		expect(decide(quoted, ask({ review: review() }))).toBeNull()

		const told = run("git commit -m 'gh pr review をやめる'")
		expect(decide(told, ask())).toBeNull()

		const listed = run('gh api repos/o/r/pulls/294/reviews')
		expect(decide(listed, ask())).toBeNull()
	})

	it('区切りの直後の発火は見る', () => {
		const chained = run(`npm test && gh workflow run review.yml -f pr=294 -F review=@${PATH}`)
		const loose = review({ event: 'COMMENT' })
		expect(decide(chained, ask({ review: loose }))?.reason).toMatch(/REQUEST_CHANGES/)
	})

	it('gh が受ける他の綴りの引数も読む', () => {
		const loose = review({ event: 'COMMENT' })
		for (const args of ['-F pr=294 -F review=@', '--field pr=294 --field review=@']) {
			const called = run(`gh workflow run review.yml ${args}${PATH}`)
			expect(decide(called, ask({ review: loose }))?.reason).toMatch(/REQUEST_CHANGES/)
		}
	})

	it('読めない JSON は黙って通す', () => {
		expect(decide(dispatch(), ask({ review: '{' }))).toBeNull()
	})
})

describe('ツールからの発火', () => {
	it('型に合うレビューは通し、緩い event を落とす', () => {
		expect(decide(trigger(review()), ask())).toBeNull()
		expect(decide(trigger(review({ event: 'COMMENT' })), ask())?.reason).toMatch(
			/REQUEST_CHANGES/,
		)
	})

	it('番号もレビューも渡さない発火を落とす', () => {
		const bare = trigger(review())
		bare.tool_input.inputs = {}
		expect(decide(bare, ask())?.reason).toMatch(/`pr`/)
	})

	it('他のワークフローと他の method は見ない', () => {
		expect(
			decide(trigger(review({ event: 'COMMENT' }), { workflow: 'lint.yml' }), ask()),
		).toBeNull()

		const rerun = trigger(review({ event: 'COMMENT' }))
		rerun.tool_input.method = 'rerun_workflow_run'
		expect(decide(rerun, ask())).toBeNull()
	})

	it('出し直しを数える', () => {
		const held = ask()
		decide(trigger(review(), { event: 'PostToolUse' }), held)
		expect(held.box.value).toEqual({ submits: 1 })
	})
})

describe('通常コメントへの逃げ', () => {
	it('判定を書いたコメントを落とす', () => {
		const summary = '**判定: Approve**\n\n- 実測: `npm run lint` は終了コード 0'
		expect(decide(posted(summary), ask())?.reason).toMatch(/review\.yml/)
	})

	it('前置きを置いたバッジも、置いた後の書き替えも落とす', () => {
		const led = posted(`レビューしました。\n\n${MUST} **見出し**`)
		expect(decide(led, ask())?.reason).toMatch(/review\.yml/)

		const edited = posted('**判定: Approve**', 'mcp__github__update_issue_comment')
		expect(decide(edited, ask())?.reason).toMatch(/review\.yml/)
	})

	it('バッジを含むコメントを落とす', () => {
		const body = `${MUST} **静的生成の HTML では閉じたままになる**`
		const tools = [
			'mcp__github__add_comment_to_pending_review',
			'mcp__github__add_reply_to_pull_request_comment',
		]
		for (const tool of tools)
			expect(decide(posted(body, tool), ask())?.reason).toMatch(/review\.yml/)
	})

	it('レビューでないコメントは通す', () => {
		const asked =
			'トーストに替えるなら、この PR で作り直します。今の形でよければ ready にします。'
		expect(decide(posted(asked), ask())).toBeNull()
		expect(decide(posted(`判定の材料が揃っていません`), ask())).toBeNull()
	})
})

describe('payload の置き場', () => {
	it('絶対パスはそのまま、相対パスだけ根に足す', () => {
		expect(resolve('/tmp/review.json', '/repo')).toBe('/tmp/review.json')
		expect(resolve('review.json', '/repo')).toBe('/repo/review.json')
	})
})

describe('インラインコメントの型', () => {
	const only = (body, place) => review({ comments: [inline(body, place)] })

	it('バッジの無いコメントと2つ付いたコメントを落とす', () => {
		const none = ask({ review: only('**見出し**\n本文') })
		expect(decide(dispatch(), none)?.reason).toMatch(/バッジが無い/)

		const both = ask({ review: only(`${MUST}${NITS} **見出し**`) })
		expect(decide(dispatch(), both)?.reason).toMatch(/2つ/)
	})

	it('先頭に無いバッジと、見出しの無いコメントを落とす', () => {
		const tail = ask({ review: only(`**見出し** ${MUST}`) })
		expect(decide(dispatch(), tail)?.reason).toMatch(/先頭/)

		const wrapped = ask({ review: only(`${MUST}\n本文`) })
		expect(decide(dispatch(), wrapped)?.reason).toMatch(/見出し/)
	})

	it('6行を超えるコメントを落とす', () => {
		const long = ask({ review: only(`${MUST} **見出し**\n\n1\n2\n3\n4\n5\n6`) })
		expect(decide(dispatch(), long)?.reason).toMatch(/6行以内/)
	})

	it('置き場所の無いコメントを落とす', () => {
		const placeless = ask({ review: only(`${MUST} **見出し**`, { line: undefined }) })
		expect(decide(dispatch(), placeless)?.reason).toMatch(/line/)
	})

	it('インラインの無いレビューを通す', () => {
		const summary = review({ event: 'APPROVE', body: '**判定: Approve**', comments: [] })
		expect(decide(dispatch(), ask({ review: summary }))).toBeNull()
	})
})

describe('バッジの綴り', () => {
	it('綴りの違うバッジを落とす', () => {
		const body = dropped(`${MUST} **見出し**`)
		const broken = ask({ review: review({ comments: [inline(body)] }) })
		expect(decide(dispatch(), broken)?.reason).toMatch(/綴り/)

		const summary = ask({ review: review({ body: dropped(MUST) }) })
		expect(decide(dispatch(), summary)?.reason).toMatch(/綴り/)
	})

	it('バッジでないリンクは見ない', () => {
		const body = `${MUST} **見出し**\n\n[ADR 03](../../docs/adr/03-flat-directory-by-type.md)`
		expect(decide(dispatch(), ask({ review: review({ comments: [inline(body)] }) }))).toBeNull()
	})
})

describe('件数の上限', () => {
	const many = (badge, times) =>
		Array.from({ length: times }, () => inline(`${badge} **見出し**`))

	it('6件目を落とす', () => {
		const over = review({ comments: many(MUST, 6) })
		expect(decide(dispatch(), ask({ review: over }))?.reason).toMatch(/5件/)

		const edge = review({ comments: many(MUST, 5) })
		expect(decide(dispatch(), ask({ review: edge }))).toBeNull()
	})

	it('imo と nits の3件目だけを落とす', () => {
		const soft = review({
			event: 'APPROVE',
			body: '**判定: Approve**',
			comments: [...many(IMO, 2), ...many(NITS, 1)],
		})
		expect(decide(dispatch(), ask({ review: soft }))?.reason).toMatch(/合わせて2件/)
	})

	it('サマリにまとめたレビューも数える', () => {
		const head = '**判定: Request changes** — 理由'
		const bundled = review({
			body: `${head}\n\n${`${MUST} **見出し**\n`.repeat(6)}`,
			comments: [],
		})
		expect(decide(dispatch(), ask({ review: bundled }))?.reason).toMatch(/5件/)
	})
})

describe('判定と event', () => {
	it('件数より緩い判定を落とす', () => {
		const loose = review({ event: 'COMMENT', body: '**判定: Comment**' })
		expect(decide(dispatch(), ask({ review: loose }))?.reason).toMatch(/Request changes/)
	})

	it('件数より緩い event を落とす', () => {
		const loose = review({ event: 'COMMENT' })
		expect(decide(dispatch(), ask({ review: loose }))?.reason).toMatch(/REQUEST_CHANGES/)
	})

	it('判定を書いていないサマリを落とす', () => {
		const bare = review({ body: '直せば良くなる' })
		expect(decide(dispatch(), ask({ review: bare }))?.reason).toMatch(/先頭行/)
	})

	it('先頭行が空でも、本文があるなら判定を要求する', () => {
		const led = review({ body: '\n前置きだけ' })
		expect(decide(dispatch(), ask({ review: led }))?.reason).toMatch(/先頭行/)
	})

	it('body の無い Approve は event 側の検証だけで通す', () => {
		const clean = review({ event: 'APPROVE', body: '', comments: [] })
		expect(decide(dispatch(), ask({ review: clean }))).toBeNull()
	})

	it('body が無くても、件数に対して緩い event は落とす', () => {
		const understated = review({
			event: 'APPROVE',
			body: '',
			comments: [inline(`${MUST} **見出し**\n\n理由。`)],
		})
		expect(decide(dispatch(), ask({ review: understated }))?.reason).toMatch(/REQUEST_CHANGES/)
	})

	it('判定の名前でない event を落とす', () => {
		const wrong = review({ event: 'DISMISS' })
		expect(decide(dispatch(), ask({ review: wrong }))?.reason).toMatch(/REQUEST_CHANGES/)
	})

	it('数えた件数より厳しい判定は通す', () => {
		const strict = review({
			event: 'REQUEST_CHANGES',
			body: '**判定: Request changes** — 未対応 2件',
			comments: [],
		})
		expect(decide(dispatch(), ask({ review: strict }))).toBeNull()
	})

	it('3回の出し直しを通し、その次を落とす', () => {
		expect(decide(dispatch(), ask({ review: review(), held: { submits: 3 } }))).toBeNull()

		const held = { submits: 4 }
		expect(decide(dispatch(), ask({ review: review(), held }))?.reason).toMatch(/3回/)
	})
})

describe('出し直しを数える', () => {
	it('投稿ごとに回数を足す', () => {
		const it_ = ask({ review: review(), held: { submits: 1 } })
		decide(dispatch('PostToolUse'), it_)
		expect(it_.box.value).toEqual({ submits: 2 })
	})

	it('落ちた呼び出しは数えない', () => {
		const it_ = ask({ review: review() })
		decide({ ...dispatch('PostToolUse'), tool_response: { isError: true } }, it_)
		expect(it_.box.value).toBeNull()
	})
})

describe('読み取れないとき', () => {
	it('手順書から判定を組み立てられなければ黙って通す', () => {
		const broken = ask({ source: '# レビュー\n\n何も表が無い', review: review() })
		expect(decide(dispatch(), broken)).toBeNull()
		expect(decide(skill(), broken)).toBeNull()
	})

	it('他のツールと他のコマンドは見ない', () => {
		expect(decide(run('ls'), ask())).toBeNull()
		expect(decide({ tool_name: 'Read', tool_input: { file_path: 'a' } }, ask())).toBeNull()
		expect(decide({}, ask())).toBeNull()
	})
})
