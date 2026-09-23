import { describe, expect, it } from 'vitest'
import { decide } from '~~/.claude/hooks/issue-guard.mjs'
import { load } from '~~/scripts/issue-shape.mjs'

const FORMS = load()

const ask = (forms = FORMS) => ({ forms: () => forms })

const BODY = [
	'## ゴール',
	'',
	'タグの一覧に他のタグの記事が混ざらない。',
	'',
	'## 現状',
	'',
	'- 日本語だけのタグで一覧が混ざる',
	'',
	'## 完了条件',
	'',
	'- [ ] 日本語だけのタグでも一覧が混ざらない',
].join('\n')

const write = (over = {}) => ({
	hook_event_name: 'PreToolUse',
	tool_name: 'mcp__github__issue_write',
	tool_input: {
		method: 'create',
		owner: 'uyaaaaaa',
		repo: 'personal-blog',
		title: 'タグの一覧が混ざる',
		body: BODY,
		labels: ['bug'],
		...over,
	},
})

describe('decide', () => {
	it('型に合う issue は通す', () => {
		expect(decide(write(), ask())).toBeNull()
	})

	it('欠いた項目を理由に止める', () => {
		const reason = decide(write({ body: BODY.split('\n').slice(0, 4).join('\n') }), ask())
		expect(reason).toMatch('## 現状 が無い')
		expect(reason).toMatch('## 完了条件 が無い')
		expect(reason).toMatch('.github/ISSUE_TEMPLATE/')
	})

	it('create で本文もラベルも渡さなければ止める', () => {
		const reason = decide(write({ body: undefined, labels: undefined }), ask())
		expect(reason).toMatch('## ゴール が無い')
		expect(reason).toMatch('ラベルは')
	})

	it('更新は見ない。PR のラベル付けも同じ口を通る', () => {
		const update = { method: 'update', issue_number: 369, title: undefined, body: undefined }
		expect(decide(write({ ...update, labels: ['agent'] }), ask())).toBeNull()
		expect(
			decide(write({ ...update, labels: undefined, title: 'fix: 直す' }), ask()),
		).toBeNull()
	})

	it('issue を作らない呼び出しは見ない', () => {
		expect(decide(write({ method: 'get' }), ask())).toBeNull()
		expect(
			decide({ tool_name: 'mcp__github__add_issue_comment', tool_input: {} }, ask()),
		).toBeNull()
		expect(decide({}, ask())).toBeNull()
	})

	it('テンプレートから型を読めなければ通す', () => {
		expect(decide(write({ body: '' }), ask([]))).toBeNull()
	})
})
