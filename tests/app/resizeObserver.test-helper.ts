import { vi } from 'vitest'

// happy-dom の ResizeObserver はレイアウトを持たず発火しないので、テストから叩ける形に差し替える
export const stubResizeObserver = () => {
	const observed: Array<{ target: Element; callback: () => void }> = []

	vi.stubGlobal(
		'ResizeObserver',
		class {
			constructor(private readonly callback: () => void) {}

			observe(target: Element) {
				observed.push({ target, callback: this.callback })
				this.callback()
			}

			disconnect() {
				for (let i = observed.length - 1; i >= 0; i--) {
					if (observed[i]?.callback === this.callback) observed.splice(i, 1)
				}
			}
		},
	)

	return {
		resize: (target?: Element) => {
			for (const entry of [...observed]) {
				if (target === undefined || entry.target === target) entry.callback()
			}
		},
		restore: () => {
			observed.length = 0
			vi.unstubAllGlobals()
		},
	}
}
