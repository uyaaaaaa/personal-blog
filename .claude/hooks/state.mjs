// hook がツール呼び出しを跨いで持つ状態の置き場。hook 側でファイルを開かず、ここを通す。
// .verify/ は git 管理外で、verify がセッションの頭で作り直す。前回の状態を引き継がない
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIRECTORY = '.verify/hooks'

// CLAUDE_PROJECT_DIR は hook を起こす Claude が渡す。テストはこれを差し替える
const root = () => process.env.CLAUDE_PROJECT_DIR || process.cwd()

// agent_id や name にパスの区切りが来ても、置き場の外に出さない
const segment = (value) => value.replace(/[^\w-]/g, '_')

export const state = (name, { agent_id: agent } = {}) => {
	// agent_id はサブエージェント内で発火したときだけ入る。本体と状態を混ぜない
	const file = [name, agent].filter(Boolean).map(segment).join('.')
	const path = join(root(), DIRECTORY, `${file}.json`)

	return {
		read: () => {
			try {
				return JSON.parse(readFileSync(path, 'utf8'))
			} catch {
				return null
			}
		},
		write: (value) => {
			mkdirSync(join(root(), DIRECTORY), { recursive: true })
			writeFileSync(path, JSON.stringify(value))
		},
	}
}
