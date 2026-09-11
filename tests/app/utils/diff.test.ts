import { describe, expect, it } from 'vitest'
import { changedWordMarks, isFileHeader, pairLines, similarity } from '~/utils/diff'

const word = (from: number, to: number) => ({ from, to, className: 'diff-word' })

describe('isFileHeader', () => {
	it('ファイル名の付いた --- と +++ の行だけを拾う', () => {
		expect(isFileHeader('--- a/app/utils/diff.ts')).toBe(true)
		expect(isFileHeader('+++ b/app/utils/diff.ts')).toBe(true)
	})

	it('通常の削除行と追加行は拾わない', () => {
		expect(isFileHeader('-const a = 1')).toBe(false)
		expect(isFileHeader('+const a = 2')).toBe(false)
	})

	it('ファイル名の無い --- は拾わない', () => {
		expect(isFileHeader('---')).toBe(false)
	})
})

describe('similarity', () => {
	it('同じ文字列を 1 にする', () => {
		expect(similarity('const a = 1', 'const a = 1')).toBe(1)
	})

	it('前後の空白を無視する', () => {
		expect(similarity('  const a = 1  ', 'const a = 1')).toBe(1)
	})

	it('語の一部が同じでも共通とみなさない', () => {
		expect(similarity('abcd', 'abcdefgh')).toBe(0)
	})

	it('空白だけの行を 0 にする', () => {
		expect(similarity('   ', 'const a = 1')).toBe(0)
		expect(similarity('const a = 1', '')).toBe(0)
	})
})

describe('pairLines', () => {
	it('似ている削除行と追加行を組にする', () => {
		const lines = ['-const a = 1', '+const a = 2']

		expect(pairLines(lines, [0], [1])).toEqual([[0, 1]])
	})

	it('似ていない行を組にしない', () => {
		const lines = ['-aaa bbb ccc', '+xxx yyy zzz']

		expect(pairLines(lines, [0], [1])).toEqual([])
	})

	it('似ている順に組み、1行を二度使わない', () => {
		const lines = [
			'-alpha beta gamma',
			'-alpha beta gamma delta',
			'+alpha beta gamma delta epsilon',
		]

		expect(pairLines(lines, [0, 1], [2])).toEqual([[1, 2]])
	})

	it('組にできる分だけ組み、余った行は落とす', () => {
		const lines = ['-const a = 1', '-aaa bbb ccc', '+const a = 2', '+xxx yyy zzz']

		expect(pairLines(lines, [0, 1], [2, 3])).toEqual([[0, 2]])
	})

	it('行頭のマーカーを比較に含めない', () => {
		const lines = ['-const a = 1', '+const a = 1']

		expect(pairLines(lines, [0], [1])).toEqual([[0, 1]])
	})

	it('候補が無ければ何も組まない', () => {
		expect(pairLines(['-const a = 1'], [0], [])).toEqual([])
	})
})

describe('changedWordMarks', () => {
	it('変化した語の位置を、行頭のマーカーを含む列で返す', () => {
		const [removed, added] = changedWordMarks('const a = 1', 'const a = 2')

		expect(removed).toEqual([word(11, 12)])
		expect(added).toEqual([word(11, 12)])
		expect('-const a = 1'.slice(11, 12)).toBe('1')
		expect('+const a = 2'.slice(11, 12)).toBe('2')
	})

	it('削除された語と追加された語を別々に数える', () => {
		const [removed, added] = changedWordMarks('let a = 1', 'const a = 1')

		expect('-let a = 1'.slice(removed[0]!.from, removed[0]!.to)).toBe('let')
		expect('+const a = 1'.slice(added[0]!.from, added[0]!.to)).toBe('const')
	})

	it('複数の語が変わったら全部返す', () => {
		const [removed, added] = changedWordMarks('let a = 1', 'const a = 2')

		expect(removed).toHaveLength(2)
		expect(added).toHaveLength(2)
	})

	it('変化が無ければ印を付けない', () => {
		expect(changedWordMarks('const a = 1', 'const a = 1')).toEqual([[], []])
	})

	it('空白だけの変化に印を付けない', () => {
		expect(changedWordMarks('const a = 1', 'const  a = 1')).toEqual([[], []])
	})
})
