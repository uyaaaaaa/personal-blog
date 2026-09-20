import { describe, expect, it } from 'vitest'
import { attachments, named, parse, prompt, summary, turns } from '~~/scripts/session-cost.mjs'

const assistant = (id, usage, content = []) => ({
	type: 'assistant',
	message: { id, usage, content },
})

const used = (created, read, out = 0) => ({
	cache_creation_input_tokens: created,
	cache_read_input_tokens: read,
	output_tokens: out,
})

describe('parse', () => {
	it('壊れた行を飛ばして残りを読む', () => {
		expect(parse('{"a":1}\nこれは JSON ではない\n\n{"a":2}')).toEqual([{ a: 1 }, { a: 2 }])
	})
})

describe('turns', () => {
	it('同じ応答が複数行に割れていても1ターンに畳む', () => {
		const rows = turns([
			assistant('msg_1', used(100, 200), [{ type: 'thinking' }]),
			assistant('msg_1', used(100, 200), [{ type: 'tool_use', name: 'Bash' }]),
			assistant('msg_2', used(50, 300), [{ type: 'tool_use', name: 'Read' }]),
		])

		expect(rows).toHaveLength(2)
		expect(rows[0]).toMatchObject({ created: 100, read: 200, tools: ['Bash'] })
		expect(rows[1]).toMatchObject({ created: 50, read: 300, tools: ['Read'] })
	})

	it('usage の無い行は数えない', () => {
		expect(turns([{ type: 'user' }, assistant('msg_1', undefined)])).toEqual([])
	})
})

describe('summary', () => {
	it('1ターン目の入力を固定費として出す', () => {
		const it_ = summary([
			assistant('msg_1', used(24911, 38673)),
			assistant('msg_2', used(3124, 63584)),
		])

		expect(it_.fixed).toBe(63584)
		expect(it_.peak).toBe(66708)
		expect(it_.created).toBe(28035)
	})

	it('積み上げた順に並べ、何番目のターンかを残す', () => {
		const it_ = summary([
			assistant('msg_1', used(10, 0)),
			assistant('msg_2', used(900, 0), [{ type: 'tool_use', name: 'Bash' }]),
			assistant('msg_3', used(50, 0)),
		])

		expect(it_.spikes[0]).toMatchObject({ at: 2, created: 900, tools: ['Bash'] })
	})
})

describe('attachments', () => {
	it('毎ターン送られない prompt_snapshot を注入の集計から外す', () => {
		const found = attachments([
			{ type: 'attachment', attachment: { type: 'prompt_snapshot', systemPrompt: [] } },
			{ type: 'attachment', attachment: { type: 'skill_listing' } },
			{ type: 'attachment', attachment: { type: 'skill_listing' } },
		])

		expect(found.prompt_snapshot).toBeUndefined()
		expect(found.skill_listing.count).toBe(2)
	})
})

describe('prompt', () => {
	it('system prompt のバイト数を出す', () => {
		const records = [
			{
				type: 'attachment',
				attachment: { type: 'prompt_snapshot', systemPrompt: ['ab', 'cde'] },
			},
		]

		expect(prompt(records)).toBe(JSON.stringify('ab').length + JSON.stringify('cde').length)
	})

	it('記録が無ければ 0', () => {
		expect(prompt([])).toBe(0)
	})
})

describe('named', () => {
	it('サブエージェントの記録には、どの型で起こしたかを添える', () => {
		const name = named('/logs/agent-abc.jsonl', (path) => {
			expect(path).toBe('/logs/agent-abc.meta.json')
			return JSON.stringify({ agentType: 'measure' })
		})

		expect(name).toBe('agent-abc.jsonl  [measure]')
	})

	it('隣に記録が無ければファイル名だけ', () => {
		expect(
			named('/logs/session.jsonl', () => {
				throw new Error('ENOENT')
			}),
		).toBe('session.jsonl')
	})
})
