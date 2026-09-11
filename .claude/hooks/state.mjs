// hook がツール呼び出しを跨いで持つ状態の置き場。hook 側でファイルを開かず、ここを通す。
// リポジトリの外に置く。.verify/ は verify が確認フェーズの頭で作り直すので、
// それより前に hook が書いた状態がセッションの途中で消える
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// テストはこれを差し替える
const directory = () => process.env.CLAUDE_HOOK_STATE_DIR || join(tmpdir(), 'claude-hook-state')

// パスの区切りが来ても、置き場の外に出さない
const segment = (value) => value.replace(/[^\w-]/g, '_')

export const state = (name, { session_id: session, agent_id: agent } = {}) => {
	// session_id はセッションごとに変わる。置き場は消されないので、前のセッションが
	// 書いた状態を今のものと取り違えない。
	// agent_id はサブエージェント内で発火したときだけ入る。本体と状態を混ぜない
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
