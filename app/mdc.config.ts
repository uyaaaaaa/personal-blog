import { defineConfig } from '@nuxtjs/mdc/config'
import type { ShikiTransformerContext } from 'shiki'
import type { Element, ElementContent } from 'hast'
// mdc.config.ts は Nuxt のエイリアス解決の外で jiti が読むため、ここだけ ~/ を使えない
import { changedWordMarks, isFileHeader, pairLines, type Mark } from './utils/diff'

const LINE_CLASS: Record<string, string> = {
	'+': 'diff-add',
	'-': 'diff-remove',
}

const textOf = (node: ElementContent): string =>
	node.type === 'text'
		? node.value
		: node.type === 'element'
			? node.children.map(textOf).join('')
			: ''

// 行のトークンspanを範囲の境界で切り分け、範囲に収まる断片にクラスを足す
function markLine(this: ShikiTransformerContext, line: Element, marks: Mark[]) {
	const cuts = new Set(marks.flatMap((mark) => [mark.from, mark.to]))
	const children: ElementContent[] = []
	let position = 0

	for (const child of line.children) {
		const text = textOf(child)
		if (child.type !== 'element') {
			children.push(child)
			position += text.length
			continue
		}

		const boundaries = [...cuts]
			.filter((cut) => cut > position && cut < position + text.length)
			.sort((x, y) => x - y)
		const pieces: Element[] = []
		let start = 0
		for (const end of [...boundaries.map((cut) => cut - position), text.length]) {
			if (end === start) continue
			const value = text.slice(start, end)
			const previous = pieces.at(-1)
			// 空白だけのspanはNuxt Contentの圧縮で落ちるため、直前の断片に繋げる
			if (previous && !value.trim()) {
				;(previous.children[0] as { value: string }).value += value
			} else {
				const piece: Element = {
					...child,
					properties: { ...child.properties },
					children: [{ type: 'text', value }],
				}
				const mark = marks.find((m) => position + start >= m.from && position + end <= m.to)
				if (mark) this.addClassToHast(piece, mark.className)
				pieces.push(piece)
			}
			start = end
		}
		children.push(...pieces)
		position += text.length
	}

	line.children = children
}

// Shikiのdiff文法は追加行・削除行を1色に塗るだけでhastに印を残さないため、行頭の記号から起こす
export default defineConfig({
	shiki: {
		transformers: [
			{
				name: 'diff-lines',
				code() {
					if (this.options.lang !== 'diff') return

					const lines = this.source.split('\n')
					const marks: Mark[][] = lines.map(() => [])
					let hunk: number[] = []

					const closeHunk = () => {
						const removed = hunk.filter(
							(i) => lines[i]!.startsWith('-') && !isFileHeader(lines[i]!),
						)
						const added = hunk.filter(
							(i) => lines[i]!.startsWith('+') && !isFileHeader(lines[i]!),
						)
						for (const [r, a] of pairLines(lines, removed, added)) {
							const [removedMarks, addedMarks] = changedWordMarks(
								lines[r]!.slice(1),
								lines[a]!.slice(1),
							)
							marks[r]!.push(...removedMarks)
							marks[a]!.push(...addedMarks)
						}
						hunk = []
					}

					lines.forEach((text, i) => {
						const className = LINE_CLASS[text.charAt(0)]
						if (!className) {
							closeHunk()
							return
						}
						this.addClassToHast(this.lines[i]!, className)
						marks[i]!.push({ from: 0, to: 1, className: 'diff-marker' })
						hunk.push(i)
					})
					closeHunk()

					this.lines.forEach((line, i) => {
						if (marks[i]!.length) markLine.call(this, line, marks[i]!)
					})
				},
			},
		],
	},
})
