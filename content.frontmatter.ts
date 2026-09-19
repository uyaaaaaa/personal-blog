import { parseFrontMatter } from 'remark-mdc'
import { LineCounter, parseDocument } from 'yaml'

const CLOSING = '\n---'
const CR = /\r$/

const yamlOf = (body: string, rest: string) => {
	const block = body.slice(0, body.length - rest.length)
	return block.slice(0, block.lastIndexOf(CLOSING)).replace(CR, '')
}

export const readFrontMatter = (body: string): Record<string, unknown> => {
	const { content, data } = parseFrontMatter(body)

	const lineCounter = new LineCounter()
	const options = { prettyErrors: false, lineCounter }
	const { errors, warnings } = parseDocument(yamlOf(body, content), options)
	const [problem] = [...errors, ...warnings]
	if (problem)
		throw new Error(`${lineCounter.linePos(problem.pos[0]).line}行目: ${problem.message}`)

	return data
}
