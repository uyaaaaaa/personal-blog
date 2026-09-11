import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directory = () => process.env.CLAUDE_HOOK_STATE_DIR || join(tmpdir(), 'claude-hook-state')

// パスの区切りが来ても、置き場の外に出さない
const segment = (value) => value.replace(/[^\w-]/g, '_')

export const state = (name, { session_id: session, agent_id: agent } = {}) => {
	const file = [session ?? 'none', agent, name].filter(Boolean).map(segment).join('.')
	const path = join(directory(), `${file}.json`)

	return {
		read: () => {
			try {
				return JSON.parse(readFileSync(path, 'utf8'))
			} catch {
				return null
			}
		},
		write: (value) => {
			mkdirSync(directory(), { recursive: true })
			writeFileSync(path, JSON.stringify(value))
		},
	}
}
