import { diffWordsWithSpace } from 'diff'

// 組にした行の共通部分がこれ未満なら行全体が書き換わったとみなし、語の強調を付けない
const PAIR_SIMILARITY_MIN = 0.5

export type Mark = { from: number; to: number; className: string }

// unified diffのファイル名行（`--- a/x` / `+++ b/x`）
export const isFileHeader = (line: string) => /^(---|\+\+\+) /.test(line)

export function similarity(a: string, b: string): number {
	const oldText = a.trim()
	const newText = b.trim()
	if (!oldText || !newText) return 0
	const common = diffWordsWithSpace(oldText, newText)
		.filter((part) => !part.added && !part.removed)
		.reduce((length, part) => length + part.value.length, 0)
	return common / Math.max(oldText.length, newText.length)
}

// 同じハンクの `-` 行と `+` 行を、似ている順に1対1で組にする
export function pairLines(lines: string[], removed: number[], added: number[]): [number, number][] {
	const candidates: [number, number, number][] = []
	for (const r of removed) {
		for (const a of added) {
			const score = similarity(lines[r]!.slice(1), lines[a]!.slice(1))
			if (score >= PAIR_SIMILARITY_MIN) candidates.push([r, a, score])
		}
	}
	candidates.sort((x, y) => y[2] - x[2])

	const used = new Set<number>()
	const pairs: [number, number][] = []
	for (const [r, a] of candidates) {
		if (used.has(r) || used.has(a)) continue
		used.add(r)
		used.add(a)
		pairs.push([r, a])
	}
	return pairs
}

// 変化した語の範囲を、マーカーを含む行内の位置で返す
export function changedWordMarks(oldText: string, newText: string): [Mark[], Mark[]] {
	const removed: Mark[] = []
	const added: Mark[] = []
	let o = 1
	let n = 1
	for (const part of diffWordsWithSpace(oldText, newText)) {
		const isWord = Boolean(part.value.trim())
		if (!part.added) {
			if (part.removed && isWord)
				removed.push({ from: o, to: o + part.value.length, className: 'diff-word' })
			o += part.value.length
		}
		if (!part.removed) {
			if (part.added && isWord)
				added.push({ from: n, to: n + part.value.length, className: 'diff-word' })
			n += part.value.length
		}
	}
	return [removed, added]
}
