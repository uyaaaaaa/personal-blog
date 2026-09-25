import { format } from 'node:util'
import { vi } from 'vitest'

const EXITED = Symbol('exited')

export const inProcess = async (main, ...args) => {
	const output = { stdout: '', stderr: '' }
	let status = null
	const write =
		(stream) =>
		(...values) => {
			if (status === null) output[stream] += `${format(...values)}\n`
		}
	const spies = [
		vi.spyOn(console, 'log').mockImplementation(write('stdout')),
		vi.spyOn(console, 'error').mockImplementation(write('stderr')),
		vi.spyOn(process, 'exit').mockImplementation((code = 0) => {
			status ??= code
			throw EXITED
		}),
	]
	try {
		await main(...args)
	} catch (error) {
		if (status === null) throw error
	} finally {
		for (const spy of spies) spy.mockRestore()
	}
	return { status: status ?? 0, ...output }
}
